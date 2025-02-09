/*
  Basic File I/O for displaying
  Skeleton Author: Joshua A. Levine
  Modified by: Amir Mohammad Esmaieeli Sikaroudi
  Email: amesmaieeli@email.arizona.edu
*/


//access DOM elements we'll use
var input = document.getElementById("load_image");
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

// The width and height of the image
var width = 0;
var height = 0;
// The image data
var ppm_img_data;

var rotationInterval;

//Function to process upload
var upload = function () {
    if (input.files.length > 0) {
        var file = input.files[0];
        console.log("You chose", file.name);
        if (file.type) console.log("It has type", file.type);
        var fReader = new FileReader();
        fReader.readAsBinaryString(file);

        fReader.onload = function(e) {
            //if successful, file data has the contents of the uploaded file
            var file_data = fReader.result;
            parsePPM(file_data);

            var currentAngle = 0;
            rotationInterval = setInterval(() => {
                // this function will rotate the image every 5 degrees 
                // every .1 seconds
                currentAngle += 5; 
                if (currentAngle >= 360) {
                    currentAngle = currentAngle-360;
                }
                rotate(currentAngle);
            }, 100); 

            ctx.putImageData(newImageData, canvas.width / 2 - width / 2, canvas.height / 2 - height / 2);
        }


	    // Create a new image data object to hold the new image
        var newImageData = ctx.createImageData(width, height);
	    var transMatrix = GetTranslationMatrix(0, height);// Translate image
	    var scaleMatrix = GetScalingMatrix(1, -1);// Flip image y axis
	    var matrix = MultiplyMatrixMatrix(transMatrix, scaleMatrix);// Mix the translation and scale matrices
            
            // Loop through all the pixels in the image and set its color
            for (var i = 0; i < ppm_img_data.data.length; i += 4) {

                // Get the pixel location in x and y with (0,0) being the top left of the image
                var pixel = [Math.floor(i / 4) % width, 
                             Math.floor(i / 4) / width, 1];
        
                // Get the location of the sample pixel
                var samplePixel = MultiplyMatrixVector(matrix, pixel);

                // Floor pixel to integer
                samplePixel[0] = Math.floor(samplePixel[0]);
                samplePixel[1] = Math.floor(samplePixel[1]);

                setPixelColor(newImageData, samplePixel, i);
            }

            // Draw the new image
            ctx.putImageData(newImageData, canvas.width/2 - width/2, canvas.height/2 - height/2);
	    
	    // Show matrix
            showMatrix(matrix);
        }
    }


    function rotate(angle) {
        /*
        * Rotate will rotate the loaded image and also resize it so that the images
        * corners dont go "out of bounds" of the canvas 
        * It takes one parameter, which is the current angle that the image is rotated at
        */

        var r = angle * Math.PI / 180;
    
        // here we have to find the new dimensions of our image, then determine the amount
        // the image may need to be scaled by
        var newWidth = Math.abs(width * Math.cos(r)) + Math.abs(height * Math.sin(r));
        var newHeight = Math.abs(width * Math.sin(r)) + Math.abs(height * Math.cos(r));
        var scaleBy = Math.min(width / newWidth, height / newHeight);
    
        // finding the rotation matrix determined by the given angle and the amount the 
        // image needs to be scaled by
        var rotationMatrix = [
            [scaleFactor * Math.cos(r), -scaleBy * Math.sin(r), 0],
            [scaleFactor * Math.sin(r), scaleBy * Math.cos(r), 0],
            [0, 0, 1]
        ];
    
        
        var newImageData = ctx.createImageData(width, height);
        var centerX = width / 2;
        var centerY = height / 2;
    
        // here we need to use the rotation matrix to determine the new image's 
        // pixel data (so we go through the rold image and use the transformation
        // given by rotation matrix)
        for (var i = 0; i < ppm_img_data.data.length; i += 4) {
            var x = (i / 4) % width;
            var y = Math.floor(i / 4 / width);

            var translatedPixel = [x - centerX, y - centerY, 1];
            var transformedPixel = MultiplyMatrixVector(rotationMatrix, translatedPixel);
    
            transformedPixel[0] = Math.floor(transformedPixel[0] + centerX);
            transformedPixel[1] = Math.floor(transformedPixel[1] + centerY);
    
            if (transformedPixel[0] >= 0 && transformedPixel[0] < width &&
                transformedPixel[1] >= 0 && transformedPixel[1] < height) {
                
                var newIndex = (transformedPixel[1] * width + transformedPixel[0]) * 4;
                
                // putting new image data 
                newImageData.data[newIndex] = ppm_img_data.data[i];
                newImageData.data[newIndex + 1] = ppm_img_data.data[i + 1];
                newImageData.data[newIndex + 2] = ppm_img_data.data[i + 2];
                newImageData.data[newIndex + 3] = 255;
            }
        }
    
        // replace the old image with the newly rotated image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(newImageData, 0, 0);
    }

// Show transformation matrix on HTML
function showMatrix(matrix){
    for(let i=0;i<matrix.length;i++){
        for(let j=0;j<matrix[i].length;j++){
            matrix[i][j]=Math.floor((matrix[i][j]*100))/100;
        }
    }
    document.getElementById("row1").innerHTML = "row 1:[ " + matrix[0].toString().replaceAll(",",",\t") + " ]";
    document.getElementById("row2").innerHTML = "row 2:[ " + matrix[1].toString().replaceAll(",",",\t") + " ]";
    document.getElementById("row3").innerHTML = "row 3:[ " + matrix[2].toString().replaceAll(",",",\t") + " ]";
}

// Sets the color of a pixel in the new image data
function setPixelColor(newImageData, samplePixel, i){
    var offset = ((samplePixel[1] - 1) * width + samplePixel[0] - 1) * 4;

    // Set the new pixel color
    newImageData.data[i    ] = ppm_img_data.data[offset    ];
    newImageData.data[i + 1] = ppm_img_data.data[offset + 1];
    newImageData.data[i + 2] = ppm_img_data.data[offset + 2];
    newImageData.data[i + 3] = 255;
}

// Load PPM Image to Canvas
// Untouched from the original code
function parsePPM(file_data){
    /*
   * Extract header
   */
    var format = "";
    var max_v = 0;
    var lines = file_data.split(/#[^\n]*\s*|\s+/); // split text by whitespace or text following '#' ending with whitespace
    var counter = 0;
    // get attributes
    for(var i = 0; i < lines.length; i ++){
        if(lines[i].length == 0) {continue;} //in case, it gets nothing, just skip it
        if(counter == 0){
            format = lines[i];
        }else if(counter == 1){
            width = lines[i];
        }else if(counter == 2){
            height = lines[i];
        }else if(counter == 3){
            max_v = Number(lines[i]);
        }else if(counter > 3){
            break;
        }
        counter ++;
    }
    console.log("Format: " + format);
    console.log("Width: " + width);
    console.log("Height: " + height);
    console.log("Max Value: " + max_v);
    /*
     * Extract Pixel Data
     */
    var bytes = new Uint8Array(3 * width * height);  // i-th R pixel is at 3 * i; i-th G is at 3 * i + 1; etc.
    // i-th pixel is on Row i / width and on Column i % width
    // Raw data must be last 3 X W X H bytes of the image file
    var raw_data = file_data.substring(file_data.length - width * height * 3);
    for(var i = 0; i < width * height * 3; i ++){
        // convert raw data byte-by-byte
        bytes[i] = raw_data.charCodeAt(i);
    }
    // update width and height of canvas
    document.getElementById("canvas").setAttribute("width", window.innerWidth);
    document.getElementById("canvas").setAttribute("height", window.innerHeight);
    // create ImageData object
    var image_data = ctx.createImageData(width, height);
    // fill ImageData
    for(var i = 0; i < image_data.data.length; i+= 4){
        let pixel_pos = parseInt(i / 4);
        image_data.data[i + 0] = bytes[pixel_pos * 3 + 0]; // Red ~ i + 0
        image_data.data[i + 1] = bytes[pixel_pos * 3 + 1]; // Green ~ i + 1
        image_data.data[i + 2] = bytes[pixel_pos * 3 + 2]; // Blue ~ i + 2
        image_data.data[i + 3] = 255; // A channel is deafult to 255
    }
    ctx.putImageData(image_data, canvas.width/2 - width/2, canvas.height/2 - height/2);
    //ppm_img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);   // This gives more than just the image I want??? I think it grabs white space from top left?
    ppm_img_data = image_data;
}

//Connect event listeners
input.addEventListener("change", upload);