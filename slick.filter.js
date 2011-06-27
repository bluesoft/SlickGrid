/**
 * A simple observer pattern implementation.
 */
function EventHelper() {
    this.handlers = [];

    this.subscribe = function(fn) {
        this.handlers.push(fn);
    };

    this.notify = function(args) {
        for (var i = 0; i < this.handlers.length; i++) {
            this.handlers[i].call(this, args);
        }
    };

    return this;
}

(function($) {
    function DataView(container) {

        var Grid = null;            // Grid instance
        var ColumnPicker = null;    // ColumnPicker instance

        var idProperty = 'id';      // property holding a unique row id
        var items = [];	            // data by index
        var rows = [];              // data by row
        var index = {};             // indexes by id

        var filters = {};           // all filter data
        var currentFilter = null;   // the filter being edited currently
        var filterTimeout = null;

        var $dom = {};              // jQuery DOM objects

        var slideToggleSpeed = 100;

        var sortBy = null;
        var sortAsc = true;
        var sortAlgorithm = null;
        var ieSort = /MSIE 6/i.test(navigator.userAgent);

        var sortLib = {
            // January, 2009 or March 10
            textualMonthDate: {
                defaultToAscending: true,
                regex: /^(January|February|March|April|May|June|July|August|September|October|November|December)(,? [0-9]{4})?$/,
                cmp: function(a, b) {
                    a = a[sortBy], b = b[sortBy];
                    a.replace(/[^0-9A-Za-z ]/g, '');
                    if (a.match(/[0-9]{4}/) == null) {
                        a = a.concat(' 1, 2010');
                    }
                    else {
                        a = a.replace(/([A-Za-z]+) ([0-9]{4})/, "$1 1, $2");
                    }
                    b.replace(/[^0-9A-Za-z ]/g, '');
                    if (b.match(/[0-9]{4}/) == null) {
                        b = a.concat(' 1, 2010');
                    }
                    else {
                        b = b.replace(/([A-Za-z]+) ([0-9]{4})/, "$1 1, $2");
                    }
                    a = new Date(a).getTime();
                    b = new Date(b).getTime();
                    return (sortAsc) ? a - b : b - a;
                }
            },
            // YYYY-MM-DD HH:MM:SS -HHMM
            iso8601: {
                defaultToAscending: true,
                regex: /^\d{4}\-\d{2}\-\d{2}\s\d{2}:\d{2}:\d{2}\s[\-\+]\d{4}$/,
                cmp: function(a, b) {
                    a = a[sortBy], b = b[sortBy];
                    a = new Date(a.replace(/-/g, '/').replace(/\s\//, ' -')).getTime();
                    b = new Date(b.replace(/-/g, '/').replace(/\s\//, ' -')).getTime();
                    return (sortAsc) ? a - b : b - a;
                }
            },
            // 5-25-2010 - 12-25-2010
            shortDateRange: {
                defaultToAscending: true,
                regex: /^\d{2}\/\d{2}\/\d{4} \- \d{2}\/\d{2}\/\d{4}$/,
                cmp: function(a, b) {
                    a = a[sortBy], b = b[sortBy];
                    a = a.replace(/ \- .*/, '');
                    b = a.replace(/ \- .*/, '');
                    a = new Date(a.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, "$3/$1/$2")).getTime();
                    b = new Date(b.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, "$3/$1/$2")).getTime();
                    return (sortAsc) ? a - b : b - a;
                }
            },
            // 5-25-2010 or 5/25/10
            shortDate: {
                defaultToAscending: true,
                regex: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
                cmp: function(a, b) {
                    a = a[sortBy], b = b[sortBy];
                    a = new Date(a.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, "$3/$1/$2")).getTime();
                    b = new Date(b.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, "$3/$1/$2")).getTime();
                    return (sortAsc) ? a - b : b - a;
                }
            },
            // 2010-5-25 or 2010/12/25
            isoDate: {
                defaultToAscending: true,
                regex: /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/,
                cmp: function(a, b) {
                    a = a[sortBy], b = b[sortBy];
                    a = new Date(a.replace(/-/g, '/')).getTime();
                    b = new Date(b.replace(/-/g, '/')).getTime();
                    return (sortAsc) ? a - b : b - a;
                }
            },
            // 25:1 or 1 : 2
            ratio: {
                defaultToAscending: false,
                regex: /^\d+\s?[\/:]\s?\d+$/,
                suffix: ' : 1',
                cmp: function(a, b) {
                    a = a[sortBy], b = b[sortBy];
                    a = a.replace('/', ':').replace(' ', '').split(':');
                    if (a.length != 2) {
                        a = 0;
                    }
                    else {
                        if (a[1] == 0) {
                            a = Number.MAX_VALUE;
                        }
                        else {
                            a = parseFloat(a[0]) / parseFloat(a[1]);
                        }
                    }
                    b = b.replace('/', ':').replace(' ', '').split(':');
                    if (b.length != 2) {
                        b = 0;
                    }
                    else {
                        if (b[1] == 0) {
                            b = Number.MAX_VALUE;
                        }
                        else {
                            b = parseFloat(b[0]) / parseFloat(b[1]);
                        }
                    }
                    return (sortAsc) ? a - b : b - a;
                }
            },
            // 12:35 or 2:52 pm or 10:45 AM
            time: {
                defaultToAscending: true,
                regex: /^(([0-2]?[0-9]:[0-5][0-9])|([0-1]?[0-9]:[0-5][0-9]\s(am|pm)))$/i,
                cmp: function(a, b) {
                    a = a[sortBy], b = b[sortBy];
                    a = new Date("2000/01/01 " + a).getTime();
                    b = new Date("2000/01/01 " + b).getTime();
                    return (sortAsc) ? a - b : b - a;
                }
            },
            // 214.200.134.146
            ipAddress: {
                defaultToAscending: true,
                regex: /^\d{2,3}[\.]\d{2,3}[\.]\d{2,3}[\.]\d{2,3}$/,
                cmp: function(a, b) {
                    a = a[sortBy], b = b[sortBy];
                    var a2 = '', b2 = '', item, i, l;
                    a = a.split('.');
                    b = b.split('.');
                    for (i = 0, l = a.length; i < l; i++) {
                        item = a[i];
                        a2 += (item.length == 2) ? '0' + item : item;
                    }
                    for (i = 0, l = b.length; i < l; i++) {
                        item = b[i];
                        b2 += (item.length == 2) ? '0' + item : item;
                    }
                    a = formatFloat(a2);
                    b = formatFloat(b2);
                    return (sortAsc) ? a - b : b - a;
                }
            },
            currency: {
                defaultToAscending: false,
                regex: /^\-?\$/,
                prefix: '$',
                cmp: function(a, b) {
                    a = a[sortBy].replace('$', '');
                    b = b[sortBy].replace('$', '');
                    a = formatFloat(a);
                    b = formatFloat(b);
                    return (sortAsc) ? a - b : b - a;
                }
            },
            percent: {
                defaultToAscending: false,
                regex: /%$/,
                suffix: '%',
                cmp: function(a, b) {
                    a = a[sortBy].replace('%', '');
                    b = b[sortBy].replace('%', '');
                    a = formatFloat(a);
                    b = formatFloat(b);
                    return (sortAsc) ? a - b : b - a;
                }
            },
            number: {
                defaultToAscending: false,
                regex: /^[0-9.,+-]+$/,
                cmp: function(a, b) {
                    a = a[sortBy], b = b[sortBy];
                    if (typeof a == 'string') {
                        a = a.replace(',', '');
                        a = formatFloat(a);
                    }
                    if (typeof b == 'string') {
                        b = b.replace(',', '');
                        b = formatFloat(b);
                    }
                    return (sortAsc) ? a - b : b - a;
                }
            },
            text: {
                defaultToAscending: true,
                regex: /./,
                cmp: function(a, b) {
                    a = a[sortBy], b = b[sortBy];
                    a = $.trim((a + '').toLowerCase());
                    b = $.trim((b + '').toLowerCase());
                    return (sortAsc) ? natCaseSort(a, b) : natCaseSort(b, a);
                }
            }
        };

        // http://my.opera.com/GreyWyvern/blog/show.dml/1671288
        function natCaseSort(a, b) {
            function chunkify(t) {
                var tz = [], x = 0, y = -1, n = 0, i, j;

                while (i = (j = t.charAt(x++)).charCodeAt(0)) {
                    var m = (i == 46 || (i >=48 && i <= 57));
                    if (m !== n) {
                        tz[++y] = "";
                        n = m;
                    }
                    tz[y] += j;
                }
                return tz;
            }

            var aa = (a) ? chunkify(a.toLowerCase()) : [];
            var bb = (b) ? chunkify(b.toLowerCase()) : [];

            for (x = 0; aa[x] && bb[x]; x++) {
                if (aa[x] !== bb[x]) {
                    var c = Number(aa[x]), d = Number(bb[x]);
                    if (c == aa[x] && d == bb[x]) {
                        return c - d;
                    }
                    else return (aa[x] > bb[x]) ? 1 : -1;
                }
            }
            return aa.length - bb.length;
        }

        // Events
        var onRowCountChanged = new EventHelper();
        var onRowsChanged = new EventHelper();

        function setGrid(target) {
            Grid = target;
            onRowCountChanged.subscribe(function(args) {
                Grid.updateRowCount();
                if ($dom.totalRowCount) {
                    $dom.totalRowCount.text('Displaying ' + args.current + ' rows');
                }
                Grid.render();
                calculateTotals();
            });
            onRowsChanged.subscribe(function(rows) {
                Grid.removeRows(rows);
                Grid.render();
            });
        }

        function setColumnPicker(target) {
            ColumnPicker = target;
        }

        function drawControls() {
            $dom.container = $(container);
            $dom.filterControls = $('<div class="slickgrid-controls clearfix"></div>').insertBefore($dom.container);
            $dom.filterFormRow = $('<div class="slickgrid-controls-secondary clearfix"></div>').insertBefore($dom.container).hide();

            if (ColumnPicker) {
                $dom.columnPickerToggle = $('<a href="#" class="slickgrid-column-picker slickgrid-pseudo-button" style="float:right;">Edit Columns</a>')
                    .click(function(e) {
                        ColumnPicker.displayContextMenu(e);
                        return false;
                    })
                    .appendTo($dom.filterControls);
            }
            $dom.addNewFilter = $('<a href="#" class="add-new-filter slickgrid-pseudo-button">Add Filter</a>')
                .click(function() {
                    if ($dom.filterFormRow.css('display') == 'none') {
                        createColumnSelector();
                    }
                    else {
                        cancelFilter();
                        delayedRefresh();
                    }
                    toggleFilterFormRow();
                    return false;
                })
                .appendTo($dom.filterControls);
            $dom.totalRowCount = $('<span class="total-row-count"></span>').appendTo($dom.filterControls);
        }

        function createColumnSelector() {
            $dom.filterFormRow.empty();
            $dom.columnSelector = $('<select></select>').appendTo($dom.filterFormRow);
            $('<option value="">Choose a Column</option>').appendTo($dom.columnSelector);
            var columns = Grid.getAllColumns();
            for (var i = 0; i < columns.length; i++) {
                if (!currentFilter && (!columns[i].filter || filters[columns[i].id].v)) {
                    continue;
                }
                var selected = (currentFilter && columns[i].id == currentFilter) ? ' selected="selected"' : '';
                $('<option value="' + columns[i].id + '"' + selected + '>' + columns[i].name + '</option>').appendTo($dom.columnSelector);
            }
            $dom.columnSelector.change(function() {
                if ($dom.columnSelector.val() == '') {
                    return false;
                }
                cancelFilter();
                currentFilter = $dom.columnSelector.val();
                constructFilter();
                return false;
            });
            if (currentFilter) {
                constructFilter();
            }
        }

        function constructFilter() {
            var filter = filters[currentFilter];
            var v = {};
            if ($dom.filterForm) {
                $dom.filterForm.remove();
            }
            $dom.filterForm = $('<div class="slickgrid-controls-container"></div>').appendTo($dom.filterFormRow);
            $dom.filter = {};
            if (filter.type == 'range') {
                v.min = (filter.v) ? filter.v.min : filter.range.min;
                v.max = (filter.v) ? filter.v.max : filter.range.max;
                $dom.filter.inputLeft = $('<input type="text" class="slider-left slider-numeric-value" />')
                    .val(v.min)
                    .keydown(handleUpDownArrows)
                    .keyup(updateSliderFromInputs)
                    .appendTo($dom.filterForm);
                $dom.filter.inputRight = $('<input type="text" class="slider-right slider-numeric-value" />')
                    .val(v.max)
                    .keydown(handleUpDownArrows)
                    .keyup(updateSliderFromInputs);
                $dom.filter.slider = $('<div class="slider-container" />')
                    .slider({
                        range: true,
                        min: (filter.range.type == 'int') ? filter.range.min : filter.range.min * 100,
                        max: (filter.range.type == 'int') ? filter.range.max : filter.range.max * 100,
                        values: [
                            (filter.range.type == 'int') ? v.min : v.min * 100,
                            (filter.range.type == 'int') ? v.max : v.max * 100
                        ],
                        slide: function(event, ui) {
                            var min = ui.values[0], max = ui.values[1];
                            if (filter.min != min || filter.max != max) {
                                min = (filter.range.type == 'int') ? min : min / 100;
                                max = (filter.range.type == 'int') ? max : max / 100;
                                filters[currentFilter].v = { min: min, max: max };
                                delayedRefresh();
                                $dom.filter.inputLeft.val(min);
                                $dom.filter.inputRight.val(max);
                            }
                        }
                    })
                    .appendTo($dom.filterForm);
                if (!filters[currentFilter].v) {
                    filters[currentFilter].v = {
                        min: filter.range.min,
                        max: filter.range.max
                    };
                }
                $dom.filter.inputRight.appendTo($dom.filterForm);
                if (filter.suffix) {
                    $dom.filter.inputRight.addClass('slickgrid-filter-has-suffix');
                    $dom.filter.inputLeft.addClass('slickgrid-filter-has-suffix');
                    $('<span class="slickgrid-filter-suffix">' + filter.suffix + '</span>').insertAfter($dom.filter.inputRight);
                    $('<span class="slickgrid-filter-suffix">' + filter.suffix + '</span>').insertAfter($dom.filter.inputLeft);
                }
                if (filter.prefix) {
                    $dom.filter.inputRight.addClass('slickgrid-filter-has-prefix');
                    $dom.filter.inputLeft.addClass('slickgrid-filter-has-prefix');
                    $('<div style="display: inline-block; float: left; position: relative;"><span class="slickgrid-filter-prefix">' + filter.prefix + '</span></div>').insertBefore($dom.filter.inputRight);
                    $('<div style="display: inline-block; float: left; position: relative;"><span class="slickgrid-filter-prefix">' + filter.prefix + '</span></div>').insertBefore($dom.filter.inputLeft);
                }
            }
            else if (filter.type == 'text') {
                v.text = (filter.v && filter.v.text) ? filter.v.text : '';
                v.type = (filter.v && filter.v.type) ? filter.v.type : 'has';
                $dom.filter.types = $('<select></select>')
                    .change(function() {
                        var filter = filters[currentFilter];
                        if ($dom.filter.types.val()) {
                            filter.v.type = $dom.filter.types.val();
                        }
                        delayedRefresh();
                    })
                    .appendTo($dom.filterForm);

                var types = [
                    { value: 'has', title: 'Contains' },
                    { value: 'not', title: "Doesn't Contain" }
                ];
                for (var i = 0; i < types.length; i++) {
                    var type = types[i];
                    var selected = (type.value == v.type) ? ' selected="selected"' : '';
                    $('<option value="' + type.value + '"' + selected + '>' + type.title + '</option>').appendTo($dom.filter.types);
                }

                $dom.filter.textInput = $('<input type="text" class="slickgrid-filter-text-value" />')
                    .val(v.text)
                    .keyup(function(e) {
                        if (e.keyCode == 13) {
                            applyFilter();
                            return false;
                        }
                        var filter = filters[currentFilter];
                        filter.v.text = $(this).val().toLowerCase();
                        delayedRefresh();
                    })
                    .appendTo($dom.filterForm);

                if (!filters[currentFilter].v) {
                    filters[currentFilter].v = { text: '', type: 'has' };
                }

            }
            $dom.applyFilterButton = $('<a class="apply-filter slickgrid-pseudo-button" href="#">Apply</a>')
                .click(applyFilter)
                .appendTo($dom.filterForm);
            $dom.cancelFilterButton = $('<a class="cancel-filter slickgrid-pseudo-button" href="#">Remove</a>')
                .click(function() {
                    cancelFilter();
                    toggleFilterFormRow();
                    delayedRefresh();
                    return false;
                })
                .appendTo($dom.filterForm);
        }

        function updateSliderFromInputs(e) {
            if (e.keyCode == 13) {
                applyFilter();
                return false;
            }
            var id = ($(this).hasClass('slider-left')) ? 'left' : 'right';
            var filter = filters[currentFilter];
            var v = $(this).val();
            if (v == '') return;
            var v2 = constrain(v, filter.range.min, filter.range.max);
            if (v != v2) {
                v = v2;
                $(this).val(v);
            }
            updateSlider(id, v);
        }

        function handleUpDownArrows(e) {
            var key = e.keyCode, up = (key == 38), down = (key == 40);
            if ((up || down) && !(e.shiftKey || e.altKey || e.ctrlKey)) {
                var id = ($(this).hasClass('slider-left')) ? 'left' : 'right';
                var filter = filters[currentFilter];
                var v = $(this).val();
                if (up) {
                    v = constrain(Math.floor(v) + 1, filter.range.min, filter.range.max);
                }
                else {
                    v = constrain(Math.ceil(v) - 1, filter.range.min, filter.range.max);
                }
                $(this).val(v);
                updateSlider(id, v);
                return e.preventDefault();
            }
            return true;
        }

        function updateSlider(id, v) {
            var v2;
            if (id == 'right') {
                v2 = formatFloat($dom.filter.inputLeft.val());
                if (v < v2) $dom.filter.inputLeft.val(v);
                updateSliderMinMax(v2, v);
            }
            else {
                v2 = formatFloat($dom.filter.inputRight.val());
                if (v > v2) $dom.filter.inputRight.val(v);
                updateSliderMinMax(v, v2);
            }
            delayedRefresh();
        }

        function updateSliderMinMax(min, max) {
            var filter = filters[currentFilter];
            $dom.filter.slider.slider('values', 0, (filter.range.type == 'int') ? min : min * 100);
            $dom.filter.slider.slider('values', 1, (filter.range.type == 'int') ? max : max * 100);
            filters[currentFilter].v = { min: min, max: max };
        }

        function cancelFilter() {
            if (currentFilter) {
                deleteFilter(currentFilter);
            }
            currentFilter = null;
            return false;
        }

        function deleteFilter(id) {
            filters[id].v = null;
            $($dom.filterControls[0]).find('div.filter_' + id).remove();
        }

        function applyFilter() {
            toggleFilterFormRow();
            saveFilter(currentFilter);
            currentFilter = null;
            return false;
        }

        function saveFilter(id) {
            var filter = filters[id];
            var v = filter.v;
            var info = '';
            var columns = Grid.getAllColumns();
            for (var i = 0; i < columns.length; i++) {
                if (columns[i].id == id) {
                    info = '<strong>' + columns[i].name + ':</strong> ';
                    break;
                }
            }
            if (filter.type == 'range') {
                // We might not be filtering anything
                if (v.min == filter.range.min && v.max == filter.range.max) {
                    deleteFilter(id);
                    return false;
                }
                if (v.min == v.max) {
                    info += filter.prefix + v.min + filter.suffix;
                }
                else if (v.min > filter.range.min && v.max < filter.range.max) {
                    info += 'between ' + filter.prefix + v.min + filter.suffix +
                            ' and ' + filter.prefix + v.max + filter.suffix;
                }
                else if (v.min > filter.range.min) {
                    info += filter.prefix + v.min + filter.suffix + ' or higher';
                }
                else if (v.max < filter.range.max) {
                    info += filter.prefix + v.max + filter.suffix + ' or lower';
                }
            }
            else if (filter.type == 'text') {
                if (v.type == 'has') {
                    info += ' contains "' + v.text + '"';
                }
                else if (v.type == 'not') {
                    info += ' doesn\'t contain "' + v.text + '"';
                }
            }
            $($dom.filterControls[0]).find('div.filter_' + id).remove();
            var ui = $('<div><a href="#">' + info + '</a><span></span></div>');
            ui.addClass('active-filter filter_' + id);
            $('span', ui).click(function() {
                deleteFilter(id);
                delayedRefresh();
                return false;
            });
            $('a', ui).click(function() {
                currentFilter = id;
                if ($dom.filterFormRow.css('display') == 'none') {
                    toggleFilterFormRow();
                }
                createColumnSelector();
                $($dom.filterControls[0]).find('div.filter_' + id).remove();
                return false;
            });
            ui.insertBefore($dom.totalRowCount);
        }

        function delayedRefresh() {
            window.clearTimeout(filterTimeout);
            filterTimeout = window.setTimeout(refresh, 10);
        }

        function toggleFilterFormRow() {
            $dom.filterFormRow.slideToggle(slideToggleSpeed);
        }

        function refreshIndex() {
            var id;
            index = {};
            for (var i = 0; i < items.length; i++) {
                id = items[i][idProperty];
                if (id == undefined || index[id] != undefined) {
                    throw "Each data element must implement a unique 'id' property";
                }
                index[id] = i;
            }
        }

        function getItemByIndex(i) {
            return items[i];
        }

        function getIndexById(id) {
            return index[id];
        }

        function getItemById(id) {
            return items[index[id]];
        }

        function refreshFilterRanges() {
            var columns = Grid.getAllColumns();
            for (var i = 0; i < columns.length; i++) {
                if (!columns[i].filter) {
                    continue;
                }
                var column = columns[i].id;
                filters[column] = (filters[column] == undefined) ? {} : filters[column];
                filters[column].type = columns[i].filter;
                if (filters[column].type != 'text') {
                    filters[column].range = findColumnRange(column);
                }
            }
        }

        function findColumnRange(column) {
            var range = {};
            range.type = 'int';
            for (var i = 0; i < items.length; i++) {
                var x = items[i][column];
                x = formatFloat(x);
                if (/\./.test(x)) {
                    range.type = 'float';
                }
                range.min = (range.min == undefined || x < range.min) ? x : range.min;
                range.max = (range.max == undefined || x > range.max) ? x : range.max;
            }
            return range;
        }

        function setItems(data, objectIdProperty) {
            if (objectIdProperty !== undefined) idProperty = objectIdProperty;
            items = data;
            refreshIndex();
            refreshFilterRanges();
            refresh();
        }

        function getItems() {
            return items;
        }

        function updateItem(id, item) {
            if (index[id] === undefined || id !== item[idProperty])
                throw "Invalid or non-matching id";
            items[index[id]] = item;
            refresh();
        }

        function updateCell(id, col, val) {
            items[index[id]][col] = val;
            refresh();
        }

        function filter(item) {
            var columns = Grid.getAllColumns();
            for (var i = 0; i < columns.length; i++) {
                if (!columns[i].filter) {
                    continue;
                }
                var column = columns[i].id;
                if (!filters[column].v) {
                    continue;
                }
                var x = item[column];
                var v = filters[column].v;
                switch (columns[i].filter) {

                    case 'range':
                        x = formatFloat(x);
                        if (x < v.min || x > v.max) {
                            return false;
                        }
                        break;

/*
                    case 'min':
                        x = formatFloat(x);
                        if (x < v.min) {
                            return false;
                        }
                        break;

                    case 'max':
                        x = formatFloat(x);
                        if (x > v.max) {
                            return false;
                        }
                        break;
*/

                    case 'text':
                        x = (x + '').toLowerCase();
                        if (v.type === 'has' && v.text !== '' && x.indexOf(v.text) === -1) {
                            return false;
                        }
                        else if (v.type === 'not' && v.text !== '' && x.indexOf(v.text) !== -1) {
                            return false;
                        }
                        break;

                }
            }
            return true;
        }

        function formatFloat(n) {
            if (typeof n !== 'number') {
                n = (n) ? parseFloat(n.replace(/[^0-9\.](\:[0-9 ]*)?/g, '')) : 0;
            }
            return (isNaN(n)) ? 0 : n;
        }

        function constrain(n, min, max) {
            if (typeof n !== 'number') {
                n = (n) ? parseFloat(n) : min;
            }
            if (isNaN(n)) return min;
            if (n < min) return min;
            if (n > max) return max;
            return n;
        }

        function calculateTotals() {
            var columns = Grid.getAllColumns();
            var totals = Grid.getTotals();
            var total, column, row, formula, rowLength;
            for (var c = 0; c < columns.length; c++) {
                column = columns[c];
                formula = column.total || 'sum';
                if (column.sortType != 'ratio' && column.sortType != 'currency' && column.sortType != 'number' && column.sortType != 'percent') {
                    continue;
                }
                total = 0;
                rowLength = 0;
                for (var i = 0, z = rows.length; i < z; i++) {
                    row = rows[i][column.id];
                    if (row == '') row = '0';
                    if (column.sortType == 'ratio') {
                        row = row.replace(' ', '').split(':')[0];
                    }
                    total += formatFloat(row);
                    rowLength++;
                }
                if (formula == 'average' || column.sortType == 'ratio') total = formatFloat(total / rowLength);
                if (column.sortType == 'ratio') total = Math.round(total);
                if ((total + '').indexOf('.') !== -1) total = total.toFixed(2);
                totals[column.id] = column.prefix + addCommas(total) + column.suffix;
            }
            Grid.setTotals(totals);
        }

        function recalc(_items, _rows) {
            var diff = [];
            var items = _items, rows = _rows; // cache as local vars

            var rowLength = rows.length,
                currentRow = 0,
                item,
                id;

            for (var i = 0, z = items.length; i < z; i++) {
                item = items[i];

                if (filter(item)) {
                    id = item[idProperty];

                    if (currentRow >= rowLength || id != rows[currentRow][idProperty]) {
                        diff.push(currentRow);
                        rows[currentRow] = item;
                    }
                    currentRow++;
                }
            }

            if (rowLength > currentRow) {
                rows.splice(currentRow, rowLength - currentRow);
            }

            return diff;
        }

        function refresh() {
            var countBefore = rows.length;
            var diff = recalc(items, rows); // pass as direct refs to avoid closure perf hit

            if (diff.length) onRowsChanged.notify(diff);
            if (countBefore != rows.length) onRowCountChanged.notify({ previous: countBefore, current: rows.length });
        }

        /* Sorting functions */

        function detectSort() {
            var columns = Grid.getAllColumns();
            for (var i = 0; i < columns.length; i++) {
                (function() {
                    var f = columns[i].field;
                    for (var item = 0; item < items.length; item++) {
                        if (item > 100) {
                            break;
                        }
                        var cellAsString = items[item][f] + ''; // concat is faster than .toString()
                        if (!cellAsString.length) {
                            continue;
                        }
                        for (var sort in sortLib) {
                            if (cellAsString.match(sortLib[sort].regex)) {
                                setSortType(i, sort);
                                return;
                            }
                        }
                    }
                    // If we can't find anything in the first 100 rows, default to text sort.
                    setSortType(i, 'text');
                })();
            }
            setPrefixSuffix();
        }

        function setPrefixSuffix() {
            var columns = Grid.getAllColumns();
            for (var i = 0; i < columns.length; i++) {
                if (!columns[i].filter) {
                    continue;
                }
                var column = columns[i].id;
                filters[column].suffix = (columns[i].suffix || '');
                filters[column].prefix = (columns[i].prefix || '');
            }
        }

        function setSortType(column, mySort) {
            var columns = Grid.getAllColumns();
            // Only add sortFunction if not already defined.
            if (typeof columns[column].sortFunction != 'function') {
                columns[column].sortFunction = sortLib[mySort].cmp;
                columns[column].sortType = mySort;
            }
            columns[column].prefix = (sortLib[mySort].prefix || '');
            columns[column].suffix = (sortLib[mySort].suffix || '');
            // This has to overwrite default setting.
            columns[column].defaultToAscending = sortLib[mySort].defaultToAscending;
        }

        function onSort(column, ascending) {
            if (sortBy == column.field) {
                items.reverse();
            }
            else {
                sortBy = column.field;
                sortAsc = ascending;
                sortAlgorithm = (column.sortFunction) ? column.sortFunction : sortLib.text.cmp;
                if (ieSort) {
                    fastSort(column.field, sortAsc);
                } else {
                    items.sort(sortAlgorithm);
                }
            }
            refreshIndex();
            refresh();
        }

        // sort for IE 6
        function fastSort(field, ascending) {
            var oldToString = Object.prototype.toString;
            Object.prototype.toString = (typeof field == 'function') ? field : function() { return this[field] };
            if (ascending === false) items.reverse();
            items.sort();
            Object.prototype.toString = oldToString;
            if (ascending === false) items.reverse();
        }

        function defaultSort() {
            var columns = Grid.getAllColumns();
            for (var i = 0; i < columns.length; i++) {
                if (!columns[i].defaultSort) {
                    continue;
                }
                var sortAsc = (columns[i].defaultSort == 'ascending');
                Grid.setSortColumn(columns[i].id, sortAsc);
                onSort(columns[i], sortAsc);
            }
        }

        function addCommas(n) {
            n = (n + '').split('.');
            var n1 = n[0];
            var n2 = n.length > 1 ? '.' + n[1] : '';
            var regex = /(\d+)(\d{3})/;
            while (regex.test(n1)) {
                n1 = n1.replace(regex, '$1' + ',' + '$2');
            }
            return n1 + n2;
        }

        return {
            // Properties
            "rows":                 rows,       // note: neither the array or the data in it should be modified directly
            "filters":              filters,

            // Methods
            "setGrid":              setGrid,
            "setColumnPicker":      setColumnPicker,
            "drawControls":         drawControls,
            "setItems":             setItems,
            "getItems":             getItems,
            "getItemByIndex":       getItemByIndex,
            "getIndexById":         getIndexById,
            "getItemById":          getItemById,
            "updateItem":           updateItem,
            "updateCell":           updateCell,
            "calculateTotals":      calculateTotals,
            "refresh":              refresh,
            "detectSort":           detectSort,
            "onSort":               onSort,
            "defaultSort":          defaultSort,

            // Events
            "onRowCountChanged":    onRowCountChanged,
            "onRowsChanged":        onRowsChanged
        };
    }

    // Slick.Data.DataView
    $.extend(true, window, { Slick: { Data: { DataView: DataView }}});

})(jQuery);
