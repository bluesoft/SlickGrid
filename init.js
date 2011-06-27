/**
 * See README file for documentation.
 */

var dataGrids = [];

$(function() {

    function init(g) {

        var defaults = {
            // Server-side storage:
            // session: {
            //    loadFrom: '/slickgrid/dummy.json',
            //    saveTo: '/slickgrid/session/save'
            // },
            // Client-side storage:
            // session: true,
            // No session handling:
            session: false,
            grid: {
                defaultMinWidth: 68,
                forceFitColumns: (g.columns.length <= 8),
                rowHeight: 21,
                showTotalsHeader: true,
                showTotalsFooter: true,
                syncColumnCellResize: true
            },
            columnPicker: {
                fadeSpeed: 150,
                showSyncResize: false
            },
            view: {
                hideTotalsOnFilter: true,
                updateTotalsOnFilter: false
            }
        };

        // Generate column defaults
        for (var i = 0, cols = g.columns.length; i < cols; i++) {
            var converted = convertName(g.columns[i]);
            g.columns[i].field = g.columns[i].field || converted;
            g.columns[i].id = g.columns[i].id || converted;
            g.columns[i].sortable = (typeof g.columns[i].sortable == 'boolean') ? g.columns[i].sortable : true;
        }

        g.options = $.extend(true, {}, defaults, g.options);
        g.container = $(g.container);

        var sessionIsActive = g.options.session;

        // Init Session
        if (sessionIsActive) {
            g.Session = new Slick.Session(g.id, g.columns, g.options.session);
            g.columns = g.Session.getColumns();
        }

        // Init DataView, Grid, ColumnPicker
        g.View = new Slick.Data.DataView(g.container, g.options.view);
        g.Grid = new Slick.Grid(g.container, g.View.rows, g.columns, g.options.grid, g.totals);
        g.ColumnPicker = new Slick.Controls.ColumnPicker(g.Grid, g.options.columnPicker);

        if (sessionIsActive) {
            g.Session.setGrid(g.Grid);
            g.Grid.onSetAllColumns = g.Session.saveColumns;
        }

        g.Grid.onColumnsReordered = function() {
            if (sessionIsActive) {
                g.Session.saveColumns();
            }
            if (g.options.view.updateTotalsOnFilter) {
                g.View.calculateTotals();
            }
        };

        g.Grid.onSort = function(column, ascending) {
            g.View.onSort(column, ascending);
            if (sessionIsActive) {
                g.Session.saveSort(column, ascending);
            }
        };

        g.View.setGrid(g.Grid);
        g.View.setColumnPicker(g.ColumnPicker);
        g.View.drawControls();
        if (g.data.length) {
            g.View.setItems(g.data);
        }

        // Update autosized column widths on window resize.
        $(window).resize(function() {
            if (g.Grid.getOptions().forceFitColumns) {
                g.Grid.autosizeColumns();
            }
        });
    }

    for (var i = 0; i < dataGrids.length; i++) {
        init(dataGrids[i]);
    }

    function convertName(column) {
        if (!column.name) {
            throw new Error('Missing "name" definition in SlickGrid column.');
        }
        if (column.field) {
            return column.field;
        }
        if (column.id) {
            return column.id;
        }
        return column.name.toLowerCase().replace(/[\s\-]/ig, '_').replace(/[^_a-z0-9]/ig, '');
    }

});
