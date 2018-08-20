/////////////////////////////////////////////////////////////////////////////////////
// Project:	S-Parameter Viewer
// Author:	Joshua Graef
// Date:	25-Nov-2011
//--------------------------------
// Description: 
// Parses a touchstone version 1 or 2 file and provides access
// to each prepared s-parameter with real or imaginary datasets.
/////////////////////////////////////////////////////////////////////////////////////

var file;
var start;
var stop;
var text;
var bReadFile = false;

// SParam file options
var m_NumPorts = 0;
var m_InputFormat = "MA";
var m_FreqMultiplier = "GHz";
var m_Parameter = "S";
var m_Resistance = 50;

var m_Version = 0;
var m_NumFrequencies = 0;
var m_NumNoiseFrequencies = 0;
var m_2PortDataOrder = "21_12";

var m_Frequency = [];
var m_Sparams = [];
  
//----------------------------------------------------------------------------------  
function initializeData()
{
	m_Sparams.length = 0;
    m_Frequency.length = 0;
    
    m_NumPorts = 0;
	m_InputFormat = "MA";
	m_FreqMultiplier = "GHz";
	m_Parameter = "S";
	m_Resistance = 50;
	
	m_Version = 0;
    m_NumFrequencies = 0;
   	m_NumNoiceFrequencies = 0;
   	m_2PortDataOrder = "";
     
    ClearButtons();
}

//----------------------------------------------------------------------------------  
function clearFile()
{
 	var files = document.getElementById('files').value = "";
	file = "";
	bReadFile = false;
	initializeData();
}

//----------------------------------------------------------------------------------
function readFile() 
{	
    var files = document.getElementById('files').files;
    if (!files.length) 
    {
    	var spb = document.getElementById('showSParamButtons').innerHTML = "Oops, you need to upload a file first.";
  		
        return;
    }

    file = files[0];
    
    // Clear our data
    initializeData();
    
    // Get number of ports from file extension
    var reg = /([^\.][a-z])$/;
    var ext = reg.exec(file.name);
    if( ext != "ts" )
    {
    	reg = /s[0-9]p/;
    	ext = reg.exec(ext);
    	
    	if( ext = "" )
    	{
    		alert("Sorry, not a valid touchstone file");
    		return;	
    	}
    }
    

    var reader = new FileReader();
 	
    // If we use onloadend, we need to check the readyState.
    reader.onloadend = function(evt) 
    {
        if (evt.target.readyState == FileReader.DONE) 
        { // DONE == 2            
            text = evt.target.result;
            lines = text.split(/\r\n|\r|\n/);
            
            parseFile(lines);
        }
    };
    
    reader.readAsText(file);  
    
    bReadFile = true; 
}

//----------------------------------------------------------------------------------
function parseFile(lines)
{	
	var bInitialized = false;	// Need to initialize sparams objects once we know how many ports there are
	var bFoundOptions = false;
	
	var iSParamData = 0;			// Controls the index of the datavalue inside the sparam
	var iExpectedTokens = 0;	// How many tokens do we expect based on the # of ports
	var iCurrentToken = 0;		// Controls the current token out of the expected tokens
	
	for(var ln=0; ln<=lines.length; ln++)
	{
		var line = lines[ln];
		line = $.trim(line);
		line = line.replace(/ +/g, " ");
		
		if (line.charAt(0) == "!")
		{
		 continue;
		}
		else if(line.charAt(0) == "#")
		{			
			// Touchstone format specifies all subsequent options lines shall be ignored
			if(bFoundOptions)
				continue;
				
			var tokens = line.split(' ');
			for(var tk=0; tk<=tokens; tk++)
			{
				if(tokens[tk] == "Hz")
					m_FreqMultiplier = 1.0;
				else if(tokens[tk] == "MHz")
					m_FreqMultiplier = 1000000;
				else if(tokens[tk] == "GHz")
					m_FreqMultiplier = 1000000000;
				else if(tokens[tk] == "MA")
					m_InputFormat = "MA";
				else if(tokens[tk] == "RI")
					m_InputFormat == "RI";
				else if(tokens[tk] == "DB")
					m_InputFormat = "DB";
				else if(tokens[tk] == "S")
					m_Parameter = "S"; // Scattering
				else if(tokens[tk] == "Y")
					m_Parameter = "Y"; // Admittance
				else if(tokens[tk] == "Z")
					m_Parameter = "Z"; // Impedance
				else if(tokens[tk] == "H")
					m_Parameter == "H"; // Hybrid-h Parameters
				else if(tokens[tk] == "G")
					m_Parameter = "G"; // Hybrid-g Parameters
				else if(tokens[tk] == "R")
					m_Resistance = parseInt(tokens[tk++]);
			}
			
			bFoundOptions = true;
		}
		else if(line.charAt(0) == "[")
		{
			// This is Touchstone Version 2 stufF
			//X [Version] 2.0
			// # (option line)
			//X [Number of Ports]

			// The following keywords shall appear after [Number of Ports] and before [Network Data], but may appear
			// in any order relative to each other.

			//X [Two-Port Order]						(required if a 2-port system is described)
			//X [Number of Frequencies]					(required)
			//X [Number of Noise Frequencies]			(required if [Noise Data] defined)
			//X [Reference]								(optional)
			// [Matrix Format]							(optional)
			// [Mixed-Mode Order]						(optional)
			// [Begin Information]/[End Information]	(optional)

			// Touchstone 2.0 data is positioned under two required keywords in the order shown below. Network data is
			// required and positioned after the required [Network Data] keyword. The [End] keyword marks the end of
			// the file and is placed last.

			// [Network Data]
			// [Noise Data]								(required only if [Number of Noise Frequencies] given)
			// [End]
			
			var tokens = line.split(']');
			switch(tokens[0])
			{
				case "[Version": 					m_Version = tokens[1]; break;
				case "[Number of Ports": 			m_NumPorts = tokens[1]; break;
				case "[Two-Port Order": 			m_2PortOrder = tokens[1]; break;
				case "[Number of Frequencies": 		m_NumFrequencies = tokens[1]; break;
				case "[Number of Noise Frequencies": m_NumNoiseFrequencies = tokens[1]; break;
				case "[Reference":					m_Reference = tokens[1]; break; // Reference is not just this easy. Need to rework.
			}				
		}
		else
		{
			if(m_NumPorts == 0)
				m_NumPorts = findNumPorts(lines, ln);
				
			if( !bInitialized )
			{
				InitlializeSParamObjects();
				
				iCurrentToken = 0;
				iExpectedTokens = ((m_NumPorts*m_NumPorts)*2);
				
				bInitialized = true;
			}
			
			// Reset the current token since we're moving on to a new line
			// Also increment the data value for the sparam lines
			if(iCurrentToken >= iExpectedTokens)
			{
				iCurrentToken = 0;
				iSParamData++;
			}
					
			// Should have max [8] here
			var tokens = line.split(' ');
			if(tokens[0] == "")
				continue;	
				
			var bMasterBatch = false;	// Master Batch is the line that includes frequency (1 extra value)	
			var iModifier = 0;			
			
			for(var ctr in tokens)
			{
				if(iCurrentToken == 0)
				{
					m_Frequency[iSParamData] = parseFloat(tokens[0]); // Don't parse float, needs to be string
					bMasterBatch = true;
				}
				else
				{
					if(bMasterBatch)
						iModifier = -1;
						
					// Since the sparams are stored in pairs, we can derive which sparam index we're talking about
					// by dividing the current token by 2. 1/2 = 1, 2/2 = 1, 3/2 = 2, 4/2 = 2, etc.
					var iWhichSParam = Math.round(iCurrentToken/2)-1; // zero-based index
						
					if((ctr % 2) + iModifier == 0)					
						m_Sparams[iWhichSParam].real[iSParamData] = parseFloat(tokens[ctr]);
					else
						m_Sparams[iWhichSParam].imaginary[iSParamData] = parseFloat(tokens[ctr]);
				}
					
				iCurrentToken++;
								
			} // END foreach token		
		} // END else
   	} // END line of file
   	
   	if(m_NumFrequencies == 0)
   		m_NumFrequencies = m_Frequency.length;
   	
    CreateButtons();
}

//----------------------------------------------------------------------------------
function CreateButtons()
{
	for(var idx in m_Sparams)
   	{
   		var spb = document.getElementById('showSParamButtons');
   		
   		if(idx % m_NumPorts == 0 && idx!=0)
  		{
  			var br = document.createElement('br');
  			spb.appendChild(br);
  		}
  		
  		var newButton = document.createElement('button');
  		newButton.setAttribute('sparam', m_Sparams[idx].name);
  		newButton.setAttribute('data-toggle', 'button');
  		newButton.setAttribute('class', 'btn');
  		newButton.innerHTML = m_Sparams[idx].name;
  		
  		spb.appendChild(newButton);
   	}
}

//----------------------------------------------------------------------------------
function ClearButtons()
{
	var spb = document.getElementById('showSParamButtons');
	if ( spb.hasChildNodes() )
	while ( spb.childNodes.length >= 1 )
		spb.removeChild( spb.firstChild );       
}

//----------------------------------------------------------------------------------
function InitlializeSParamObjects()
{
	// Make an object of SParam type
	// Set array of SParam objects
	
	for(var i=1; i<=m_NumPorts; i++)
	{
		for(var j=1; j<=m_NumPorts; j++)
		{
			var sparamObject = new Object();
			if(m_NumPorts == 2 && m_2PortDataOrder == "21_12")
				sparamObject.name = "S" + j.toString() + i.toString();
			else
				sparamObject.name = "S" + i.toString() + j.toString();
				
			sparamObject.real = [];
			sparamObject.imaginary = [];
	
			m_Sparams.push(sparamObject);
		}
	}
}

//----------------------------------------------------------------------------------
function findNumPorts(lines, iStart)
{
	
	var iArrCtr = iStart; 	// Based on the offset from the start
	var iTokensMaster = 0;	// First line is "master" line since it stores frequency
	var iTempTokenSize = 0;	// Helps determine multi-line s-param data
	var iTotalTokens = 0;	// How many pieces of data do we have
	
	var bDone = false;
	
	while(!bDone)
	{
		line = lines[iArrCtr];
		line = $.trim(line);
		line = line.replace(/ +/g, " ");
		
		if (line.charAt(0) == "!" ||
			line.charAt(0) == "#" ||
			line.charAt(0) == "[")
		{
		 return true;
		}
		else
		{			
			var tokens = line.split(' ');
			
			if(tokens[0] == "")
				return true;
				
			var numTokens = tokens.length;
				
			// First line is our master
			if(iTokensMaster == 0)
				iTokensMaster = numTokens;			
			else if(numTokens == iTokensMaster)			
				bDone = true;
			
			if(!bDone)
				iTotalTokens += numTokens;
				
			iArrCtr++;
		}	
   	}// END while
   	
   	return Math.sqrt((iTotalTokens-1)/2);
}

//----------------------------------------------------------------------------------------------
function getSParam(which)
{
	for(var sp in m_Sparams)
		if(which == m_Sparams[sp].name)
			return m_Sparams[sp];

	return -1;
}

//----------------------------------------------------------------------------------------------
function getFrequency()
{
	return m_Frequency;
}

//----------------------------------------------------------------------------------------------
function getFilename()
{
	return file.name;
}