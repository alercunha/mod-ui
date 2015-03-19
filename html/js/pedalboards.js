/*
 * Copyright 2012-2013 AGR Audio, Industria e Comercio LTDA. <contato@portalmod.com>
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function PedalboardSearcher(opt) {
    var self = this

    this.mode = opt.mode
    this.searchbox = opt.searchbox
    this.searchbutton = opt.searchbutton
    this.cleanResults = opt.cleanResults
    this.render = opt.render

    this.searchbox.cleanableInput()

    this.list = function () {
        self.cleanResults()
        opt.list(function (pedalboards) {
            for (var i in pedalboards)
                self.render(pedalboards[i], '')
        })

    }
    this.lastKeyUp = null
    this.search = function () {
        clearTimeout(self.lastKeyUp)
        var query = self.searchbox.val()
        var local = self.mode == 'installed'

        if (query.length < 3 && local)
            return self.list()

        self.cleanResults()

        opt.search(local, query,
            function (pedalboards, url) {
                self.cleanResults()
                for (var i in pedalboards)
                    self.render(pedalboards[i], url)
            })

    }

    this.searchbox.keydown(function (e) {
        if (e.keyCode == 13) {
            self.search()
            return false
        }
    })
    this.searchbox.keyup(function (e) {
        if (e.keyCode == 13)
            return
        clearTimeout(self.lastKeyUp)
        lastKeyUp = setTimeout(function () {
            self.search()
        }, 400);
    })
    if (this.searchbutton)
        this.searchbutton.click(function () {
            self.search()
            return false
        })
}

/*
 * pedalboardBox
 *
 * The interface for managing your pedal boards
 *
 * Properties:
 * - searchbox: dom of search's input
 * - searchbutton: dom
 * - resultCanvas: dom div in which results will be shown
 * - results: dictionary containing detailed data of all plugins 
 *            displayed
 */

JqueryClass('pedalboardBox', {
    init: function (options) {
        var self = $(this)

        options = $.extend({
            resultCanvas: self.find('.js-pedalboards'),
            list: function (callback) {
                callback([])
            },
            search: function (local, query, callback) {
                callback([])
            },
            remove: function (pedalboard, callback) {
                callback()
            },
            load: function (pedalboardId, callback) {
                callback()
            },
            duplicate: function (pedalboard, callback) {
                callback(pedalboard)
            }
        }, options)

        self.data(options)

        var results = {}
        self.data('results', results)

        var searcher = new PedalboardSearcher($.extend({
            searchbox: self.find('input[type=search]'),
            searchbutton: self.find('button.search'),
            mode: 'installed',
            render: function (pedalboard, url) {
                self.pedalboardBox('showPedalboard', pedalboard)
            },
            cleanResults: function () {
                self.data('resultCanvas').html('')
                self.data('results', {})
            }
        }, options))

        self.data('searcher', searcher)

        options.open = function () {
            searcher.search()
            return false
        }

        self.window(options)

        self.find('.js-close').click(function () {
            self.window('close')
        })

        return self
    },

    mode: function (mode) {
        var self = $(this)
        self.find('.js-mode').removeClass('current')
        self.find('#js-mode-' + mode).addClass('current')
        var searcher = self.data('searcher')
        searcher.mode = mode
        searcher.search()
    },

    showPedalboard: function (pedalboard) {
        var self = $(this)
        var results = self.data('results')
        var canvas = self.data('resultCanvas')
        self.pedalboardBox('render', pedalboard, canvas)
        results[pedalboard._id] = pedalboard
    },

    render: function (pedalboard, canvas) {
        var self = $(this)
        var template = TEMPLATES.pedalboard
        var rendered = $(Mustache.render(template, pedalboard.metadata))

        var load = function () {
            self.data('load')(pedalboard._id, function () {
                self.window('close')
            })
            return false
        }
        rendered.find('.js-load').click(load)
        rendered.find('img').click(load)
        rendered.find('.js-duplicate').click(function () {
            self.data('duplicate')(pedalboard, function (duplicated) {
                var dupRendered = self.pedalboardBox('render', duplicated, canvas)
                dupRendered.insertAfter(rendered)
                dupRendered.css('opacity', 0)
                dupRendered.animate({
                    opacity: 1
                }, 200)
            })
            return false
        })
        rendered.find('.js-remove').click(function () {
            self.data('remove')(pedalboard, function () {
                rendered.remove()
            })
            return false
        })

        canvas.append(rendered)
            // center thumbnail
        rendered.find('.img img').each(function () {
            var img = $(this)
            $(this).css({
                top: (img.parent().height() - img.height()) / 2
            })
        })

        return rendered
    }
})

JqueryClass('bankBox', {
    init: function (options) {
        var self = $(this)

        options = $.extend({
            bankCanvas: self.find('#bank-list .js-canvas'),
            addButton: self.find('#js-add-bank'),
            pedalboardCanvas: self.find('#bank-pedalboards'),
            pedalboardCanvasMode: self.find('#bank-pedalboards-mode'),
            searchForm: self.find('#bank-pedalboards-search'),
            searchBox: self.find('input[type=search]'),
            resultCanvas: self.find('#bank-pedalboards-result .js-canvas'),
            resultCanvasMode: self.find('#bank-pedalboards-result .js-mode'),
            bankAddressing: self.find('#bank-addressings'),
            saving: $('#banks-saving'),
            list: function (callback) {
                callback([])
            },
            search: function (local, query, callback) {
                callback([])
            },
            load: function (callback) {
                callback([])
            },
            save: function (data, callback) {
                callback(true)
            }
        }, options)

        self.data(options)

        options.pedalboardCanvasMode.pedalboardsModeSelector(options.pedalboardCanvas)
        options.resultCanvasMode.pedalboardsModeSelector(options.resultCanvas)

        options.pedalboardCanvas.hide()
        options.pedalboardCanvasMode.hide()
        options.searchForm.hide()
        options.resultCanvas.hide()
        options.resultCanvasMode.hide()
        options.addButton.click(function () {
            self.bankBox('create')
        })

        var searcher = new PedalboardSearcher($.extend({
            searchbox: options.searchBox,
            //searchbutton: self.find('button.search'),
            mode: 'installed',
            render: function (pedalboard, url) {
                var pedalboardData = self.bankBox('extractPedalboardData', pedalboard)
                var rendered = self.bankBox('renderPedalboard', pedalboardData)
                rendered.draggable({
                    revert: 'invalid',
                    connectToSortable: options.pedalboardCanvas,
                    helper: function () {
                        var helper = rendered.clone().appendTo(self)
                            //helper.addClass('pedalboards-list-item')
                        helper.width(rendered.width())
                        return helper
                    }
                })
                self.data('resultCanvas').append(rendered)
            },
            cleanResults: function () {
                self.data('resultCanvas').html('')
            }
        }, options))

        options.pedalboardCanvas.sortable({
            revert: true,
            update: function (e, ui) {
                if (self.droppedId && !ui.item.data('pedalboardId')) {
                    ui.item.data('pedalboardId', self.droppedId)
                }
                self.droppedId = null

                // TODO the code below is repeated. The former click event is not triggered because
                // the element is cloned
                ui.item.find('.js-remove').show().click(function () {
                    ui.item.animate({
                        opacity: 0,
                        height: 0
                    }, function () {
                        ui.item.remove()
                    })
                    self.bankBox('save')
                })

                self.bankBox('save')
            },
            receive: function (e, ui) {
                // Very weird. This should not be necessary, but for some reason the ID is lost between
                // receive and update. The behaviour that can be seen at http://jsfiddle.net/wngchng87/h3WJH/11/
                // does not happens here
                self.droppedId = ui.item.data('pedalboardId')
            },
        })

        //$('ul, li').disableSelection()

        options.bankCanvas.sortable({
            handle: '.move',
            update: function () {
                self.bankBox('save')
            }
        })

        options.open = function () {
            searcher.search()
            self.bankBox('load')
            return false
        }

        var addressFactory = function (i) {
            return function () {
                var current = self.data('currentBank')
                if (!current)
                    return
                var value = parseInt($(this).val())
                current.data('addressing')[i] = value
                self.bankBox('save')
            }
        }
        for (i = 0; i < 4; i++) {
            self.find('select[name=foot-' + i + ']').change(addressFactory(i))
        }

        self.window(options)
    },

    extractPedalboardData: function (pedalboard) {
        var data = $.extend({
            'id': pedalboard['_id']
        }, pedalboard.metadata)
        data.footswitches = [0, 0, 0, 0]
        if (!pedalboard.instances)
            return data
        var instance, actuator, i, symbol
        for (i in pedalboard.instances) {
            instance = pedalboard.instances[i]
            if (!instance.addressing)
                continue
            for (symbol in instance.addressing) {
                actuator = instance.addressing[symbol].actuator
                if (actuator[2] == 1) {
                    // This means actuator is a footswitch
                    // Attention: the above hardcoded value 1 comes from mod/hardware.py
                    data.footswitches[actuator[3]] = true
                }
            }
        }
        return data
    },

    load: function () {
        var self = $(this)
        self.data('load')(function (banks) {
            self.data('bankCanvas').html('')
            for (var i = 0; i < banks.length; i++) {
                self.bankBox('renderBank', banks[i])
            }
        })
    },

    save: function () {
        var self = $(this)
        var serialized = []
        self.data('bankCanvas').children().each(function () {
            var bank = $(this)
            var pedalboards = (bank.data('selected') ? self.data('pedalboardCanvas') : bank.data('pedalboards'))
            var pedalboardData = []
            pedalboards.children().each(function () {
                pedalboardData.push({
                    id: $(this).data('pedalboardId'),
                    title: $(this).find('.js-title').text()
                })
            })

            serialized.push({
                title: bank.find('.js-bank-title').text(),
                addressing: bank.data('addressing') || [0, 0, 0, 0],
                pedalboards: pedalboardData
            })
        });
        self.data('saving').html('Auto saving banks...').show()
        self.data('save')(serialized, function (ok) {
            if (ok)
                self.data('saving').html('Auto saving banks... Done!').show()
            else {
                self.data('saving').html('Auto saving banks... Error!').show()
                new Notification('error', 'Error saving banks!')
            }
            if (self.data('savingTimeout')) {
                clearTimeout(self.data('savingTimeout'))
            }
            var timeout = setTimeout(function () {
                self.data('savingTimeout', null)
                self.data('saving').hide()
            }, 500)
            self.data('savingTimeout', timeout)
        })
    },

    create: function () {
        var self = $(this)
        bank = self.bankBox('renderBank', {
            'title': '',
            'pedalboards': []
        })
        self.bankBox('editBank', bank)
        self.bankBox('selectBank', bank)
    },

    renderBank: function (bankData) {
        var self = $(this)
        var bank = $(Mustache.render(TEMPLATES.bank_item, bankData))
        var addressing = bankData.addressing || [0, 0, 0, 0]
        self.data('bankCanvas').append(bank)
        bank.data('selected', false)
        bank.data('pedalboards', $('<div>'))
        bank.data('addressing', addressing)

        var i, pedalboardData, rendered
        for (i = 0; i < bankData.pedalboards.length; i++) {
            pedalboardData = self.bankBox('extractPedalboardData', bankData.pedalboards[i])
            rendered = self.bankBox('renderPedalboard', pedalboardData)
            rendered.find('.js-remove').show()
            rendered.appendTo(bank.data('pedalboards'))
        }

        for (i = 0; i < 4; i++)
            self.find('select[name=foot-' + i + ']').val(addressing[i])

        bank.click(function () {
            if (bank.hasClass('selected'))
                self.bankBox('editBank', bank)
            else
                self.bankBox('selectBank', bank)
        })

        bank.find('.js-remove').click(function () {
            self.bankBox('removeBank', bank)
            return false
        })

        return bank
    },

    selectBank: function (bank) {
        var self = $(this)
        var pedalboards = bank.data('pedalboards')
        var canvas = self.data('pedalboardCanvas')

        var current = self.data('currentBank')
        if (current) {
            // Save the pedalboards of the current bank
            current.data('pedalboards').append(canvas.children())
            current.data('selected', false)
                // addressing is already saved, every time select is changed
        }

        canvas.append(bank.data('pedalboards').children())

        var addressing = bank.data('addressing')
        for (i = 0; i < 4; i++)
            self.find('select[name=foot-' + i + ']').val(addressing[i])

        // Show everything
        canvas.show()
        self.data('pedalboardCanvasMode').show()
        self.data('searchForm').show()
        self.data('resultCanvas').show()
        self.data('resultCanvasMode').show()

        // Mark this bank as selected
        self.data('currentBank', bank)
        bank.data('selected', true)
        self.data('bankCanvas').children().removeClass('selected')
        bank.addClass('selected')

        // Show addressing bar
        self.data('bankAddressing').show()
    },

    editBank: function (bank) {
        var self = $(this)
        var titleBox = bank.find('.js-bank-title')
        if (titleBox.data('editing'))
            return true
        titleBox.data('editing', true)
        var title = titleBox.html()
        titleBox.html('')
        var editBox = $('<input>')
        editBox.val(title)
        titleBox.append(editBox)
        var finish = function () {
            titleBox.data('editing', false)
            titleBox.html(editBox.val() || 'Untitled')
            self.bankBox('save')
        }
        editBox.keydown(function (e) {
            if (e.keyCode == 13) {
                finish()
            }
        })
        editBox.blur(finish)
        editBox.focus()
    },

    removeBank: function (bank) {
        var self = $(this)
        var count = bank.data('pedalboards').children().length
        if (count > 1 && !confirm(sprintf('There are %d pedalboards in this bank, are you sure you want to delete it?', count)))
            return
        if (bank.data('selected')) {
            self.data('currentBank', null)
            self.data('pedalboardCanvas').html('').hide()
            self.data('pedalboardCanvasMode').hide()
            self.data('searchForm').hide()
            self.data('resultCanvas').hide()
            self.data('resultCanvasMode').hide()
            self.data('bankAddressing').hide()
        }
        bank.animate({
            opacity: 0,
            height: 0
        }, function () {
            bank.remove();
            self.bankBox('save')
        })
    },

    renderPedalboard: function (pedalboardData) {
        var self = $(this)
        var template = TEMPLATES.bank_pedalboard
        var rendered = $(Mustache.render(TEMPLATES.bank_pedalboard, pedalboardData))

        // TODO is this necessary?
        rendered.addClass('js-pedalboard-item')

        // Assign remove functionality. If removal is not desired (it's a search result),
        // then the remove clickable element will be hidden
        rendered.find('.js-remove').click(function () {
            rendered.animate({
                opacity: 0,
                height: 0
            }, function () {
                rendered.remove()
            })
            self.bankBox('save')
        })

        rendered.data('pedalboardId', pedalboardData.id)

        return rendered
    }

})

/*
 * pedalboardsModeSelector
 *
 * Takes a pedalboard canvas and select between grid and list mode
 */
JqueryClass('pedalboardsModeSelector', {
    init: function (canvas) {
        var self = $(this)
        self.find('.grid').click(function () {
            self.children().removeClass('selected')
            $(this).addClass('selected')
            canvas.removeClass('list-selected')
            canvas.addClass('grid-selected')
        })
        self.find('.list').click(function () {
            self.children().removeClass('selected')
            $(this).addClass('selected')
            canvas.removeClass('grid-selected')
            canvas.addClass('list-selected')
        })
    }
})