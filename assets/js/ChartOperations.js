
var sparams = [];	// Array of sparam data sparams[0] is a set, sparams[1] is another set
var included = []; 	// Names of the sparams included. 1:1 with sparams[]
var tempSParamNames = []; // Array of temporary sparam names in case user decides not to apply changes
var bHasGraph = false;

// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great success! All the File APIs are supported.
} else {
    alert('The File APIs are not fully supported in this browser.');
}

google.load("visualization", "1", { packages: ["corechart"] });


//---------------------------------------------------------------------------------
function drawChart() 
{
	if(bHasGraph == false)
		insertGraph();
		
    var data = new google.visualization.DataTable();
   
    data.addColumn('number', 'Frequency');
    
    // Adds column for each s-param 
    $.each(included, function(i, spName) 
    {
    	data.addColumn('number', spName);
    });

    var frequency = getFrequency();
    
    data.addRows(frequency.length);

    // For each frequency we have our data points
    $.each(frequency, function(i, freq) 
    {
    	// SetValue is (row, column, data)
    	data.setValue(i, 0, freq);
    	
    	// Fill in points for each s-param based on frequency
    	$.each(included, function(j, spName) 
    	{
    		// SetValue is (row, column, data)
	 		data.setValue(i, j+1, sparams[j].real[i]);
    	});
    });

	new Dygraph.GVizChart(
    document.getElementById('dygraphs')).draw(data, 
    {
    	title: getFilename(),
    	ylabel: m_InputFormat,
    	xlabel: 'Frequency ',
    	logscale : true
    });
}

//---------------------------------------------------------------------------------
// Inserts graph to view
function insertGraph()
{
	var spb = document.getElementById('graph');
	
	var newDiv = document.createElement('div');
	newDiv.setAttribute('id', 'dygraphs');
	
	spb.appendChild(newDiv);
}

//---------------------------------------------------------------------------------
// Removes graph from the view
function removeGraph()
{	
	var node = document.getElementById("dygraphs");
	
	if(node)
	{
		if (node.parentNode)
	  		node.parentNode.removeChild(node);
	}
	
	bHasGraph = false;
}

//---------------------------------------------------------------------------------
// Puts back button state for chosen but canceled buttons
function resetButtons()
{
	if(tempSParamNames.length <= 0)
		return;
		
	var i=0;
	for(i=0; i<tempSParamNames.length; i++)
	{
		var name = '[sparam="' + tempSParamNames[i] +'"]';
		$(name).button('toggle');
	}
		
	tempSParamNames = []; // Done with the list, clear it.
}

//---------------------------------------------------------------------------------
// Adds list of user-chosen buttons to the sparam list
function addTempSParams()
{
	if(tempSParamNames.length <= 0)
		return;
		
	var i=0;
	for(i=0; i<tempSParamNames.length; i++)
		addSParam(tempSParamNames[i]);
		
	tempSParamNames = []; // Done with the list, clear it.
}

//---------------------------------------------------------------------------------
// Adds s-param to graph
function addSParam(which)
{
 	var i=0;
 	for(i=0; i<included.length; i++)
    {
    	if(included[i] == which)
    	{
    		included.splice(i,1);
    		sparams.splice(i,1);
    		return;
    	}
    }

	// Try to get the sparam, then draw the chart
	var newsparam = getSParam(which);
	if(newsparam != -1)
	{
		sparams.push(newsparam);
		included.push(newsparam.name);
	}
}