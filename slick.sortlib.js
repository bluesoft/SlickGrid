/**
 * Rich sorting for SlickGrid
 * Some parsers originally from Tablesorter.js.
 *
 * @by Andrew Childs
 */

(function($) {

    function SortLib() {

        var by = null,
            asc = true,
            algorithm = null,
            ieSort = /MSIE 6/i.test(navigator.userAgent),

            sorts = {
                textualMonthDate: {
                    defaultToAscending: true,
                    regex: /^(January|February|March|April|May|June|July|August|September|October|November|December)(,? [0-9]{4})?$/,
                    cmp: function(a, b) {
                        a = a[by], b = b[by];
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
                        return (asc) ? a - b : b - a;
                    }
                },
                // YYYY-MM-DD HH:MM:SS -HHMM
                iso8601: {
                    defaultToAscending: true,
                    regex: /^\d{4}\-\d{2}\-\d{2}\s\d{2}:\d{2}:\d{2}\s[\-\+]\d{4}$/,
                    cmp: function(a, b) {
                        a = a[by], b = b[by];
                        a = new Date(a.replace(/-/g, '/').replace(/\s\//, ' -')).getTime();
                        b = new Date(b.replace(/-/g, '/').replace(/\s\//, ' -')).getTime();
                        return (asc) ? a - b : b - a;
                    }
                },
                // 5-25-2010 - 12-25-2010
                shortDateRange: {
                    defaultToAscending: true,
                    regex: /^\d{2}\/\d{2}\/\d{4} \- \d{2}\/\d{2}\/\d{4}$/,
                    cmp: function(a, b) {
                        a = a[by], b = b[by];
                        a = a.replace(/ \- .*/, '');
                        b = a.replace(/ \- .*/, '');
                        a = new Date(a.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, "$3/$1/$2")).getTime();
                        b = new Date(b.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, "$3/$1/$2")).getTime();
                        return (asc) ? a - b : b - a;
                    }
                },
                // 5-25-2010 or 5/25/10
                shortDate: {
                    defaultToAscending: true,
                    regex: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
                    cmp: function(a, b) {
                        a = a[by], b = b[by];
                        a = new Date(a.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, "$3/$1/$2")).getTime();
                        b = new Date(b.replace(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, "$3/$1/$2")).getTime();
                        return (asc) ? a - b : b - a;
                    }
                },
                // 2010-5-25 or 2010/12/25
                isoDate: {
                    defaultToAscending: true,
                    regex: /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/,
                    cmp: function(a, b) {
                        a = a[by], b = b[by];
                        a = new Date(a.replace(/-/g, '/')).getTime();
                        b = new Date(b.replace(/-/g, '/')).getTime();
                        return (asc) ? a - b : b - a;
                    }
                },
                // 25:1 or 1 : 2
                ratio: {
                    defaultToAscending: false,
                    regex: /^\d+\s?[\/:]\s?\d+$/,
                    cmp: function(a, b) {
                        a = a[by], b = b[by];
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
                        return (asc) ? a - b : b - a;
                    }
                },
                // 12:35 or 2:52 pm or 10:45 AM
                time: {
                    defaultToAscending: true,
                    regex: /^(([0-2]?[0-9]:[0-5][0-9])|([0-1]?[0-9]:[0-5][0-9]\s(am|pm)))$/i,
                    cmp: function(a, b) {
                        a = a[by], b = b[by];
                        a = new Date("2000/01/01 " + a).getTime();
                        b = new Date("2000/01/01 " + b).getTime();
                        return (asc) ? a - b : b - a;
                    }
                },
                // 214.200.134.146
                ipAddress: {
                    defaultToAscending: true,
                    regex: /^\d{2,3}[\.]\d{2,3}[\.]\d{2,3}[\.]\d{2,3}$/,
                    cmp: function(a, b) {
                        a = a[by], b = b[by];
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
                        return (asc) ? a - b : b - a;
                    }
                },
                currency: {
                    defaultToAscending: false,
                    regex: /^\-?\$/,
                    cmp: function(a, b) {
                        a = a[by].replace('$', '');
                        b = b[by].replace('$', '');
                        a = formatFloat(a);
                        b = formatFloat(b);
                        return (asc) ? a - b : b - a;
                    }
                },
                percent: {
                    defaultToAscending: false,
                    regex: /%$/,
                    cmp: function(a, b) {
                        a = a[by].replace('%', '');
                        b = b[by].replace('%', '');
                        a = formatFloat(a);
                        b = formatFloat(b);
                        return (asc) ? a - b : b - a;
                    }
                },
                number: {
                    defaultToAscending: false,
                    regex: /^[0-9.,+-]+$/,
                    cmp: function(a, b) {
                        a = a[by], b = b[by];
                        if (typeof a == 'string' || typeof b == 'string') {
                            a = a.toString().replace(',', '');
                            b = b.toString().replace(',', '');
                            a = formatFloat(a);
                            b = formatFloat(b);
                        }
                        return (asc) ? a - b : b - a;
                    }
                },
                basic: {
                    defaultToAscending: true,
                    regex: /./,
                    cmp: function(a, b) {
                        a = a[by], b = b[by];
                        if (typeof a == 'string') {
                            a = a.toLowerCase();
                        }
                        if (typeof b == 'string') {
                            b = b.toLowerCase();
                        }
                        return (asc) ? a > b : b < a;
                    }
                }
            },

            formatFloat = function(str) {
                var i = parseFloat(str);
                return (isNaN(i)) ? 0 : i;
            },

            formatInt = function(str) {
                var i = parseInt(str);
                return (isNaN(i)) ? 0 : i;
            };

        function detect(data, columns) {
            var column, row, mySort;
            for (column in columns) {
                (function() {
                    var f = columns[column].field;
                    for (row in data) {
                        if (row > 100) {
                            break;
                        }
                        if (!data[row][f].toString().length) {
                            continue;
                        }
                        for (mySort in sorts) {
                            if (data[row][f].toString().match(sorts[mySort].regex)) {
                                setSortType(column, mySort);
                                return;
                            }
                        }
                    }
                    // If we can't find anything in the first 100 rows, default to basic (text) sort.
                    setSortType(column, 'basic');
                })();
            }
        }

        function setSortType(column, mySort) {
            // Only add sortType if not already defined.
            if (typeof columns[column].sortType != 'function') {
                columns[column].sortType = sorts[mySort].cmp;
            }
            // This has to overwrite default setting.
            columns[column].defaultToAscending = sorts[mySort].defaultToAscending;
        }

        function onSort(grid, data, column, ascending) {
            if (by == column.field) {
                data.reverse();
            }
            else {
                by = column.field;
                asc = ascending;
                algorithm = (column.sortType) ? column.sortType : sorts.basic.cmp;
                if (ieSort) {
                    fastSort(data, column.field, asc);
                } else {
                    data.sort(algorithm);
                }
            }
            grid.invalidate();
            grid.render();
        }

        // sort for IE 6
        function fastSort(data, field, ascending) {
            var oldToString = Object.prototype.toString;
            Object.prototype.toString = (typeof field == 'function') ? field : function() { return this[field] };
            if (ascending === false) data.reverse();
            data.sort();
            Object.prototype.toString = oldToString;
            if (ascending === false) data.reverse();
        }

        return {
            // methods
            'detect': detect,
            'onSort': onSort
        };
    }

    // Slick.SortLib
    $.extend(true, window, { Slick: { SortLib: SortLib }});

})(jQuery);
