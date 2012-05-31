// JavaScript Document

/*
 * FileSender www.filesender.org
 * 
 * Copyright (c) 2009-2011, AARNet, HEAnet, SURFnet, UNINETT
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * *	Redistributions of source code must retain the above copyright
 * 	notice, this list of conditions and the following disclaimer.
 * *	Redistributions in binary form must reproduce the above copyright
 * 	notice, this list of conditions and the following disclaimer in the
 * 	documentation and/or other materials provided with the distribution.
 * *	Neither the name of AARNet, HEAnet, SURFnet and UNINETT nor the
 * 	names of its contributors may be used to endorse or promote products
 * 	derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// when cancelling an upload we need to wait till the chunk is complete before allowing the cancel to happen
// setting cancell upload to true will trigger the upload to stop before uploading the next chunk
var cancelUploadStatus = "false";
 
function gearsActive(){
if (!window.google || !google.gears) {
   getFlexApp('filesender').gearsActive("false");
	}
	else
     { 
   getFlexApp('filesender').gearsActive("true");
  }
}

function gearsup(){
	return browse();
}

function DoneLoading() {
if(jQuery.browser.mozilla) {
    var img = new Image();
    img.src = 'ff_icon.png';
}
}


/**
 * Display information to the client
 */
function addStatus(s,m){ 
	// return status to flex
	getFlexApp('filesender').returnStatus(s,m);
	return 1;
}

// check browser type
function getFlexApp(appName)
{
  if (navigator.appName.indexOf ("Microsoft") !=-1)
  {
    return window[appName];
  }
  else
  {
    return document[appName];
  }
}
/**
 * Get the minimum of two results.
 */
function min(a,b){ return (a<b?a:b); }

// Gears specific upload settings
// will need to use config settings in next beta

var CHUNK_BYTES		= 2000000; 	// < 200MB Send file in chunks of 2MB (2000000) -50000000 works 50MB
var MAX_FILE_SIZE	= 1000000000000;	// Limit the total upload size
var UPLOAD_RETRIES	= 3;		// Number of retries
var mylist		= {}; 		// Array of file and properties
var fileName		= "";		// Index of mylist that is being processed


/**
 * Get the minimum of two results.
 */
function min(a,b){ return (a<b?a:b); }

/**
 * Open file browser window
 */
 
function browse(){
	
	var desktop = google.gears.factory.create('beta.desktop');
	mylist		= {};  // clear files list
	
	desktop.openFiles( function(files) {
		
		for ( var i = 0; i < files.length; i++ )
		{
			if ( mylist[files[i].name] ){ continue; } // Has the file by the same name already been selected?
			
			mylist[files[i].name] = {
				filename:	files[i].name, 
				uploaded:	0,
				length: 	files[i].blob.length, 
				blob:		files[i].blob, 
				bytesUploaded: 0,
				status:		(files[i].blob.length>MAX_FILE_SIZE?"File too large":"Pending")};
			
			//addStatus( "Selected: " + files[i].name + " " + files[i].blob.length,"msg" );
			addStatus( files[i].blob.length,"filesize");
			addStatus( files[i].name,"filename");
   
		}
		//$('#upload').html('<a href="#upload" onclick="return upload();">Upload</a>');
	},
    { singleFile: true  }
    //  { singleFile: true }
	);
}

function setResumeposition(resumePosition,fileNm)
{
	
	//resumePosition = (parseInt(rleft) * 10000000) + parseInt(rright);
	mylist[fileNm].uploaded =  parseInt(resumePosition);//parseInt(resumePosition);
	addStatus( resumePosition,"msg");
}

function upload(voucheruid)
{
	var chunkLength, chunk;
	
	/**
	 * Loop through the files and upload the next file/chunk
	 */
	
	for ( file in mylist ) if ( ( mylist[file].uploaded < mylist[file].length && !mylist[file].error ) )
	{
		
		/**
		 * what is the current filename
		 */
		fileName = file;
		chunkLength = min( mylist[file].uploaded + CHUNK_BYTES, mylist[file].length);
		/**
		 * Get the next chunk to send.
		 */
		 //addStatus("","aaaaa");
		 chunk = mylist[file].blob.slice( mylist[file].uploaded, (chunkLength - mylist[file].uploaded) );
		
		/**
		 * Send Chunk
		 */
		
		sendChunk( mylist[file], chunk, mylist[file].uploaded, chunkLength, mylist[file].length,voucheruid );
		break;
	}
}

function cancelUpload ()
{
	cancelUploadStatus = "true";
}

function sendChunk ( entry, chunk, start, end, total,voucheruid )
{
	var req = google.gears.factory.create('beta.httprequest');
	var prcnt = Math.ceil( ( end/total ) * 100 );
	addStatus(prcnt,"percentage");
	/**
	 * Start Post
	 */
	req.open('POST', 'fs_gears_upload.php?n='+encodeURIComponent(fileName)+'&b='+encodeURIComponent(start)+'&vid='+voucheruid+'&total='+total );
	//req.open('POST', 'upload2.php?n='+encodeURIComponent(fileName)+'&b='+encodeURIComponent(start) );
	
	/**
	 * Assign Headers
	 */ 
	
	var h = { 'Content-Disposition'	: 'attachment; filename="' + fileName + '"', 
					'Content-Type' 	: 'application/octet-stream',
					'Content-Range'	: 'bytes ' + start + '-' + end + '/' + total };
	
	
	for( var x in h ) if (h.hasOwnProperty(x)) { 
	req.setRequestHeader( x, h[x] );
	addStatus(x + ":" + h[x],"msg");
	}
	
	/**
	 * Build Response function
	 */
	 
	req.onreadystatechange = function(){

			if (cancelUploadStatus == "true")
			{
				//var req = google.gears.factory.create('beta.httprequest');
				req.abort();
				mylist		= {};  // clear files list
				addStatus("upload Cancelled","cancelled");
				cancelUploadStatus = "false";
				return;
			}
			
		//addStatus(prcnt,"percentage");
		if(req.responseText == "Error"){
		req.abort();
		mylist		= {};  // clear files list
		addStatus("Error Uploading","error");
		}
		
		if(req.responseText == "ErrorAuth"){
		req.abort();
		mylist		= {};  // clear files list
		addStatus("Error Unable to Authenticate","errorauth");
		}
		
		if (req.readyState == 4 && addStatus( "Resp: (" + req.status + ")" ) && req.status == 200 ) {
			entry.uploaded = end;
			//addStatus( fileName + ( (end + 1) >= total ? " Finished" : ' Upload: so far ' + prcnt + '%' ),"msg" );
			if( (end + 1) >= total){
			addStatus( "","complete");
			}
			upload(voucheruid);
		}
	}

	/**
	 * Send Chunk
	 */
	req.send(chunk);

}
	/**
	 * return reference to the flash app to allow communication between gears and flash
	 */
	 
function gup( name )
{
	// returns URL string specified by name(vid)
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regexS = "[\\?&]"+name+"=([^&#]*)";
	var regex = new RegExp( regexS );
	var results = regex.exec( window.location.href );
	var gearsStatus = false;
	if (!window.google || !google.gears) {
  		gearsStatus = false;
	}
	else
     { 
		gearsStatus = true;
  }
	if( results == null )
   getFlexApp('filesender').checkVoucher("",gearsStatus);
  else
    getFlexApp('filesender').checkVoucher(results[1],gearsStatus); 
}