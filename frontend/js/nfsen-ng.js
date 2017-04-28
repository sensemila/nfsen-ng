/*
 config object {
    "sources": {
        "gate": [false,false], // timestamp start, timestamp end
        "swi6": [false,false]
    },
    "stored_output_formats":[],
    "stored_filters":[]
 }
 */
var config;
var date_range;
var graph;
var api_graph_options;

$(document).ready(function() {

    /*Get config from backend by sending a HTTP GET request to the API.
    * The data that is returned contains the config needed by the frontend.
    * The config contains ??? need to discuss with bollm6, don't get the woodoo magic :-)
    * */
    $.get('../api/config', function(data, status) {
        if (status === 'success') {
            config = data;
            init();
        } else {
            console.log('There was probably a problem with getting the config.');
            // todo consequences?
        }
    });

    // navigation
    $(document).on('click', 'header a', function() {
        var view = $(this).attr('data-view');
        var $filter = $('#filterDiv').find('div.filter');
        var $content = $('#contentDiv').find('div.content');

        $('header li').removeClass('active');
        $(this).parent().addClass('active');

        var showRightDiv = function(id, el) {
            if ($(el).attr('data-view') === view) $(el).show();
            else $(el).hide();
        };

        $filter.each(showRightDiv);
        $content.each(showRightDiv);
    });

    // update date range slider
    // set time window or time slot
    $(document).on('change', 'input[name=singledouble]', function() {
        date_range.update({
            type: $(this).val()
        });
    });

    // set predefined time range
    $(document).on('change', 'input[name=range]', function() {
        date_range.update({
            from: date_range.options.to-$(this).val(),
            to: date_range.options.to,
        });
    });

    // update time range after source change
    $(document).on('change', '#graphFilterSourceSelection', function() {
        var sources = $(this).val(), max = 0, min = 0;

        // calculate minimum and maximum for multiple sources
        $.each(sources, function(id, source) {
          var currentStart = config['sources'][source][0]*1000;
          var currentEnd = config['sources'][source][1]*1000;
          if (min === 0 || min > currentStart) min = currentStart;
          if (max === 0 || max < currentEnd) max = currentEnd;
        });
        console.log('updated date range');
        date_range.update({
            min: min,
            max: max
        });
    });

    // initialize application
    function init() {

        // initialize date range slider
        $('#date_range').ionRangeSlider({
            type: 'double',
            grid: true,
            min: 1482828600000,
            max: 1490604300000,
            force_edges: true,
            drag_interval: true,
            prettify: function(ut) {
                var date = new Date(ut);
                return date.toDateString();
            },
            onFinish: function(data) {
                console.log(data);
            }
        });
        date_range = $('#date_range').data('ionRangeSlider');

        // check if we have a config
        // todo probably a red half-transparent overlay over the whole page?
        if (typeof config !== 'object') console.log('Could not read config!');

        updateSources(Object.keys(config["sources"]));

        // initial showing of graph
        api_graph_options = {
            datestart: config.sources['swi6'][0], // hardcoding bad, michael!
            dateend: config.sources['swi6'][1], // hardcoding bad, michael!
            type: 'flows',
            protocols: $('#graphsFilterProtocolDiv').find('input:checked').map(function() { return $(this).val(); }).get(),
            sources: $('#graphFilterSourceSelection').val(),
        };
        updateGraph();


        /**
         * reads options from api_graph_options, performs a request on the API
         * and tries to display the received data in the graph.
         */
        function updateGraph() {
            $.get('../api/graph', api_graph_options, function (data, status) {
                if (status === 'success') {

                    // transform data to something Dygraph understands
                    var dygraph_data = [];
                    var labels = ['Date'];

                    // iterate over labels
                    $.each(data.legend, function(id, legend) {
                        labels.push(legend);
                    });

                    // iterate over values
                    $.each(data.data, function(datetime) {
                        var pushable = [ new Date(datetime*1000) ];

                        $.each(this, function(y, val) {
                            pushable.push(val);
                        });

                        dygraph_data.push(pushable);
                    });

                    graph = new Dygraph(
                        document.getElementById("flowDiv"),
                        dygraph_data, {
                            title : 'Test Graph for time series : flows',
                            //axisLabelFontSize : 15,
                            labels: labels,
                            ylabel : 'Flows',
                            xlabel : 'Date / Time',
                            visibility: [true, true, true, true, true],
                            labelsKMB : true,
                            labelsDiv : document.getElementById("flowStatusDiv"),
                            labelsSeparateLines : true,
                            legend : 'always',
                            //stackedGraph : true,
                            //logscale : true,
                            showRangeSelector: true
                        }
                    );
                } else {
                    console.log('There was probably a problem with getting graph data.');
                    // todo consequences?
                }
            });
        }
    }
});


function updateSources(sources) {

    var filterViewsChildren = document.getElementById("filterDiv").children;

    for (var i = 0; i < filterViewsChildren.length; i++)
    {
        var temp = filterViewsChildren[i].getElementsByTagName("select");

        for (var j = 0; j < temp.length; j++)
        {
            if (temp[j].hasAttribute("data-filter-type"))
            {
                $.each(sources, function(key, value) {
                    $(temp[j])
                        .append($("<option></option>")
                            .attr("value",value)
                            .attr("selected", "selected")
                            .text(value));
                })
            }
        }

    }
}