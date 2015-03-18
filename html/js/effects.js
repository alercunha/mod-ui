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

/*
 * effectBox
 *
 * The interface for searching, selecting and installing plugins
 *
 * Properties:
 * - mode: The search mode, indicated by top buttons
 * - searchbox: dom of search's input
 * - resultCanvas: dom div in which results will be shown
 * - categoryBrowse: dom div with category menu
 * - results: dictionary containing detailed data of all plugins 
 *            displayed
 */
JqueryClass('effectBox', {
    init: function(options) {
	var self = $(this)

	options = $.extend({
	    pedalboard: $('<div>'),
	    windowManager: null,
	    userSession: null,
	    removePlugin: function(plugin, callback) { callback(true) },
	    installPlugin: function(plugin, callback) { callback(plugin) },
	    upgradePlugin: function(plugin, callback) { callback(plugin) }
	}, options)

	self.data(options)

	var mode = getCookie('searchMode', 'installed')
	self.find('input[name=mode][value='+mode+']').prop('checked', true)

	self.find('input[type=radio]').change(function() {
		self.effectBox('search')
	})

	var settingsBox = self.find('#plugins-library-settings-window')
	var searchbox = self.find('input[type=search]')

	searchbox.cleanableInput()

	//var categoryBrowse = self.find('div.categories')

	var results = {}

	settingsBox.window({
	    windowManager: options.windowManager,
	    trigger: self.find('.js-settings-trigger')
	})

	self.data('searchbox', searchbox)
	//self.data('categoryBrowse', categoryBrowse)

	/*
	self.data('mode', 'installed')
	self.find('#js-mode-installed').addClass('current')
	self.find('.js-mode').click(function() {
	    var mode = $(this).attr('id').replace(/^.+-/, '')
	    self.effectBox('mode', mode)
	    return false
	})
	*/

	searchbox.keydown(function(e) {
	    if (e.keyCode == 13) {
		self.effectBox('search')
		return false
	    }
	})
	var lastKeyUp;
	searchbox.keyup(function(e) {
	    if (e.keyCode == 13)
		return
	    clearTimeout(lastKeyUp)
	    if (e.keyCode == 13)
		return
	    lastKeyUp = setTimeout(function() {
		self.effectBox('search')
	    }, 400);
	})

 	self.droppable({
	    accept: '.js-available-effect',
	    drop: function( event, ui ) {
		//ui.helper.consumed = true
	    }
	})

	self.data('category', null)
	// CATEGORY TABS
	self.find('ul.js-category-tabs li').click(function() {
	    var category = $(this).attr('id').replace(/^effect-tab-/, '')
	    self.effectBox('setCategory', category)
	})

	self.find('.js-effects-fold').click(function() {
	    self.effectBox('toggle')
	})

	self.find('.nav-left').click(function() { self.effectBox('shiftLeft') })
	self.find('.nav-right').click(function() { self.effectBox('shiftRight') })

	//self.effectBox('fold')
	self.effectBox('setCategory', 'All')
	self.effectBox('search')

	return self
    },

    fold: function() {
	var self = $(this)
	self.find('.js-effects-list').hide()
	self.addClass('folded')
	self.find('.js-effects-fold').hide()
    },

    unfold: function() {
	var self = $(this)
	self.find('.js-effects-list').show()
	self.removeClass('folded')
	self.find('.js-effects-fold').show()
    },

    toggle: function() {
        var self = $(this)
        if (self.hasClass('folded'))
            self.effectBox('unfold')
        else
            self.effectBox('fold')
    },

    setCategory: function(category) {
	var self = $(this)
	self.find('ul.js-category-tabs li').removeClass('selected')
 	self.find('.plugins-wrapper').hide()
	self.find('#effect-tab-'+category).addClass('selected')
	self.find('#effect-content-'+category).show().css('display', 'inline-block')
	self.data('category', category)
	self.effectBox('unfold')
	self.effectBox('calculateNavigation')
    },

    search: function() {
	var self = $(this)
	var searchbox = self.data('searchbox')
	var mode = self.find('input[name=mode]:checked').val() || 'installed'

	setCookie('searchMode', mode)

	var term = searchbox.val()
    
	var query = { 'term': term }

	if (mode == 'installed')
	    self.effectBox('searchInstalled', query)
	else if (mode == 'not-installed')
	    self.effectBox('searchNotInstalled', query)
	else
	    self.effectBox('searchAll', query)
    },

    searchInstalled: function(query) {
	var self = $(this)

	var url = query.term ? '/effect/search/' : '/effect/list/'
	$.ajax({'method': 'GET',
		'url': url,
		'data': query,
		'success': function(plugins) {
		    for (var i=0; i<plugins.length; i++) {
			plugins[i].installedVersion = [ plugins[i].minorVersion, 
							plugins[i].microVersion, 
							plugins[i].release || 0 ]
			plugins[i].status = 'installed'
		    }
		    self.effectBox('showPlugins', plugins)
		},
		'dataType': 'json'
	       })
    },

    searchAll: function(query) {
	/* Get an array of plugins from cloud, organize local plugins in a dictionary indexed by url.
	   Then show all plugins as ordered in cloud, but with aggregated metadata from local plugin.
	   All plugins installed but not in cloud (may be installed via sdk) will be unordered at end of list.
	 */
	var self = $(this)
	var results = {}
	var plugins = []
	var plugin, i;

	renderResults = function() {
	    for (i in results.cloud) {
		plugin = results.cloud[i]
		plugin.latestVersion = [ plugin.minorVersion, plugin.microVersion, plugin.release ]
		plugin.source = SITEURL.replace(/api\/?$/, '')
		if (results.local[plugin.url]) {
		    plugin.installedVersion = [ results.local[plugin.url].minorVersion,
						results.local[plugin.url].microVersion,
						results.local[plugin.url].release || 0
					      ]
		    delete results.local[plugin.url]
		}
		if (plugin.installedVersion == null) {
		    plugin.status = 'blocked'
		} else if (compareVersions(plugin.installedVersion, plugin.latestVersion) == 0) {
		    plugin.status = 'installed'
		} else {
		    plugin.status = 'outdated'
		}
		plugins.push(plugin)
	    }
	    for (url in results.local) {
		plugin = results.local[url]
		plugin.installedVersion = [ plugin.minorVersion, 
					    plugin.microVersion,
					    plugin.release || 0
					  ]
		plugin.status = 'installed'
		plugins.push(plugin)
	    }
	    self.effectBox('showPlugins', plugins)
	}

	var url = query.term ? '/effect/search/' : '/effect/list/'

	$.ajax({'method': 'GET',
		'url': url,
		'data': query,
		'success': function(plugins) {
		    results.local = {}
		    for (i in plugins)
			results.local[plugins[i].url] = plugins[i]
		    if (results.cloud != null)
			renderResults()
		},
		'dataType': 'json'
	       })
	
	$.ajax({'method': 'GET',
		'url': SITEURL+url,
		'data': query,
		'success': function(plugins) {
		    results.cloud = plugins
		    if (results.local != null)
			renderResults()
		},
		'dataType': 'json'
	       })
    },

    searchNotInstalled: function(query) {
	/* Get an array of plugins from cloud and a dict of installed plugins by url.
	   Show only those plugins not installed
	 */
	var self = $(this)
	var results = {}
	var plugin, i;
	
	renderResults = function() {
	    var plugins = []
	    for (i in results.cloud) {
		plugin = results.cloud[i]
		plugin.latestVersion = [ plugin.minorVersion, plugin.microVersion, plugin.release ]
		plugin.status = 'blocked'
		plugin.source = SITEURL.replace(/api\/?$/, '')
		if (!results.local[plugin.url])
		    plugins.push(plugin)
	    }
	    self.effectBox('showPlugins', plugins)
	}

	var url = query.term ? '/effect/search/' : '/effect/list/'

	$.ajax({'method': 'GET',
		'url': url,
		'data': query,
		'success': function(plugins) {
		    results.local = {}
		    for (i in plugins)
			results.local[plugins[i].url] = plugins[i]
		    if (results.cloud != null)
			renderResults()
		},
		'dataType': 'json'
	       })
	
	$.ajax({'method': 'GET',
		'url': SITEURL+url,
		'data': query,
		'success': function(plugins) {
		    results.cloud = plugins
		    if (results.local != null)
			renderResults()
		},
		'dataType': 'json'
	       })
    },

    showPlugins: function(plugins) {
	var self = $(this)
	self.effectBox('cleanResults')
	for (var i in plugins) {
	    self.effectBox('getLabelAndAuthor', plugins[i])
	}
	plugins.sort(function(a, b) {
	    if (a.label > b.label)
		return 1
	    if (a.label < b.label)
		return -1
	    return 0
	})
	self.data('plugins', plugins)

	var count = { 'All': 0 }
	//plugin.category_path = plugin.category.join(', ')
	var category
	for (i in plugins) {
	    category = plugins[i].category[0]
	    if (count[category] == null)
		count[category] = 1
	    else
		count[category] += 1
	    count.All += 1

	    self.effectBox('renderPlugin', i, self.find('#effect-content-All'))
	    self.effectBox('renderPlugin', i, self.find('#effect-content-'+category))
	}

	var currentCategory = self.data('category')
	var empty = true
	for (category in count) {
	    var tab = self.find('#effect-tab-'+category)
	    tab.html(tab.html() + ' (' + count[category] + ')')
	    if (category == currentCategory && count[category] > 0)
		empty = false;
	}

	self.effectBox('calculateNavigation')

	/*
	if (empty || (currentCategory == null)) {
	    currentCategory = Object.keys(count).sort(function(a,b) { return count[b]-count[a] })[0]
	    self.effectBox('setCategory', currentCategory)
	}
	*/

    },

    getLabelAndAuthor: function(plugin) {
	// TODO Very dirty, temporary GAMBI
	if (plugin.gui && plugin.gui.templateData) {
	    plugin.label = plugin.gui.templateData.label
	    plugin.author = plugin.gui.templateData.author
	}
	plugin.label = plugin.label || plugin.name.split(/\s*-\s*/)[0]
    },

    renderPlugin: function(index, container) {
	var self = $(this)
	if (container.length == 0)
	    return
	var plugin = self.data('plugins')[index]
	plugin.urle = escape(plugin.url)

	var rendered = $(Mustache.render(TEMPLATES.plugin, plugin))

	self.data('pedalboard').pedalboard('registerAvailablePlugin', rendered, plugin, 
					   {
					       distance: 5,
					       delay: 100,
					       start: function() {
						   if (self.data('info'))
						       self.data('info').remove()
						   self.data('windowManager').closeWindows()
						   self.window('fade')
					       },
					       stop: function() {
						   self.window('unfade')
					       }
					   })
	
	rendered.click(function() {
	    self.effectBox('showPluginInfo', index)
	})

	container.append(rendered)
	// this 200px extra is a good margin to make sure the container's parent will
	// always be big enough. it's impossible at this moment to know the necessary width,
	// as this will be given by images not yet loaded.
	container.parent().width(container.parent().width() + rendered.width() + 200)
    },

    showPluginInfo: function(index) {
	var self = $(this)
	var plugins = self.data('plugins')
	var plugin = plugins[index]

	plugin.title = plugin.name.split(/\s*-\s*/)[0]
	plugin.subtitle = plugin.name.split(/\s*-\s*/)[1]
	plugin.installed_version = version(plugin.installedVersion)
	plugin.latest_version = version(plugin.latestVersion)
	plugin.package_name = plugin.package.replace(/\.lv2$/, '')
	plugin.description = (plugin.description || '').replace(/\n/g, '<br\>\n')

	var info = $(Mustache.render(TEMPLATES.plugin_info, plugin))

	if (plugin.rating)
	    $(info.find('.rating')[0]).addClass(['', 'one', 'two', 'three', 'four', 'five'][Math.round(plugin.rating)])

	var checkVersion = function() {
	    if (compareVersions(plugin.latestVersion, plugin.installedVersion) == 0)
		self.effectBox('getRating', plugin, info.find('.js-rate'))

	    self.effectBox('getReviews', plugin.url, info, function() {

		var title = info.find('input[name=title]')
		var comment = info.find('textarea[name=comment]')

		if (compareVersions(plugin.latestVersion, plugin.installedVersion) == 0) {
		    info.find('.js-comment').click(function() {
			var userSession = self.data('userSession')
			userSession.login(function() {
			    $.ajax({ url: SITEURL+'/effect/comment/'+userSession.sid,
				     method: 'POST',
				     data: JSON.stringify({ 'title': title.val(),
					     'comment': comment.val(),
					     'url': plugin.url,
					     'version': version(plugin.latestVersion)
					   }),
				     success: function(res) {
					 if (res.ok) {
					     title.val('')
					     comment.val('')
					     self.effectBox('getReviews', plugin.url, info)
					 } else {
					     alert(res.error)
					 }
				     },
				     error: function() {
					 new Notification('error', "Couldn't post comment")
				     },
				     dataType: 'json'
				   })
			})
			return false
		    })
		} else {
		    title.attr('placeholder', 'Please install and test latest version before commenting')
		    title.attr('disabled', true)
		    comment.attr('disabled', true)
		    info.find('.js-comment').attr('disabled', true)
		}
	    })
	}

	if (plugin.latestVersion)
	    checkVersion()
	else {
	    $.ajax({ url: SITEURL+'/effect/get/',
		     data: { url: plugin.url },
		     success: function(pluginData) {
			 plugin.latestVersion = [ pluginData.minorVersion, 
						  pluginData.microVersion, 
						  pluginData.release ]
			 info.find('.js-latest-version span').html(version(plugin.latestVersion))
			 checkVersion()
		     },
		     dataType: 'json'
		   })
	}

	info.window({
	    windowManager: self.data('windowManager'),
	    close: function() {
		info.remove()
		self.data('info', null)
	    }
	})
	info.appendTo($('body'))
	info.window('open')
	self.data('info', info)
    },

    getReviews: function(url, info, callback) {
	var self = $(this)
	$.ajax({ url: SITEURL+'/effect/reviews/',
		 data: { url: url },
		 success: function(comments) {
		     var classes = ['', 'one', 'two', 'three', 'four', 'five']
		     for (var i in comments) {
			 comments[i].created = renderTime(new Date(comments[i].created * 1000))
			 if (comments[i].rating)
			     comments[i].rating = classes[comments[i].rating]
		     }
		     var reviews = $(Mustache.render(TEMPLATES.plugin_reviews,
						     { comments: comments }
						    ))
		     info.find('section.comments').html('').append(reviews)
		     if (callback)
			 callback()
		 },
		 dataType: 'json'
	       })
    },

    getRating: function(plugin, widget, callback) {
	var self = $(this)
	var userSession = self.data('userSession')
	var classes = [ '---', 'one', 'two', 'three', 'four', 'five' ]
	var setRate = function(rating) {
	    for (var i in classes)
		widget.removeClass(classes[i])
	    if (rating)
		widget.addClass(classes[rating])
	}
	var rate = function(element) {
	    var rating
	    for (var i in classes) {
		if (element.hasClass(classes[i]))
		    rating = i
	    }
	    setRate(rating)
	    $.ajax({ url: SITEURL+'/effect/rate/'+userSession.sid,
		     data: JSON.stringify({ url: plugin.url,
					    version: plugin.latestVersion,
					    rating: rating
					  }),
		     method: 'POST',
		     success: function(result) {
			 if (result.ok)
			     setRate(result.rating)
			 else
			     alert(result.error)
		     },
		     dataType: 'json'
		   })
	}
	if (!userSession.sid) {
	    widget.children().click(function() {
		var element = $(this)
		userSession.login(function() { rate(element) })
	    })
	    if (callback)
		callback()
	    return
	}
	$.ajax({ url: SITEURL+'/effect/rate/'+userSession.sid+'/mine',
		 data: { url: plugin.url },
		 success: function(rating) {
		     setRate(rating)
		     widget.children().click(function() {
			 rate($(this))
		     })
		     if (callback)
			 callback()
		 },
		 dataType: 'json'
	       })
    },

    cleanResults: function() {
	var self = $(this)
	self.find('.plugins-wrapper').html('')
	self.find('ul.js-category-tabs li').each(function() {
	    $(this).html($(this).html().split(/\s/)[0])
	});
	self.effectBox('resetShift')
	//$('#js-effect-info').hide()
    },

    calculateNavigation: function() {
	var self = $(this)
	var wrapper = self.find('.plugins-wrapper:visible')
	if (wrapper.length == 0)
	    return
	var shift = wrapper.position().left
	var maxShift = Math.max(0, wrapper.width() - wrapper.parent().width())
	if (shift == 0)
	    self.find('.nav-left').addClass('disabled')
	else
	    self.find('.nav-left').removeClass('disabled')
	if (shift == maxShift)
	    self.find('.nav-right').addClass('disabled')
	else
	    self.find('.nav-right').removeClass('disabled')
    },

    resetShift: function() {
	$(this).find('.plugins-wrapper').css('left', 0)
    },

    shiftLeft: function() {
	var self = $(this)
	var wrapper = self.find('.plugins-wrapper:visible')
	var parent = wrapper.parent().parent()
	var shift = -wrapper.position().left
	var newShift = Math.max(0, shift - parent.width())
	self.effectBox('shiftTo', newShift)
    },

    shiftRight: function() {
	var self = $(this)
	var wrapper = self.find('.plugins-wrapper:visible')
	var parent = wrapper.parent().parent()
	var shift = -wrapper.position().left
	var maxShift = Math.max(0, wrapper.width())
	var newShift = Math.min(maxShift, shift + parent.width())
	if (newShift < maxShift)
	    self.effectBox('shiftTo', newShift)
    },

    shiftTo: function(newShift) {
	var self = $(this)
	var wrapper = self.find('.plugins-wrapper:visible')
	var plugins = wrapper.children()
	var shift = 0
	var step
	for (var i=0; i<plugins.length; i++) {
	    step = $(plugins[i]).outerWidth()
	    if (shift + step > newShift)
		return wrapper.animate({ left: -shift }, 500)
	    shift += step
	}
	wrapper.animate({ left: -newShift }, 500)
    }
})

// Compares two version arrays. They are both known to have two non-negative integers.
function compareVersions(a, b) {
    if (!a && !b)
	return 0
    if (!b)
	return 1
    if (!a)
	return -1
    for (var i=0; i<3; i++) {
	if (a[i] > b[i])
	    return 1
	if (a[i] < b[i])
	    return -1
    }
    return 0
}

function version(v) {
    if (!v || !v.length)
	return '0'
    var version = v[0]
    if (v.length < 2)
	return version
    version += '.' + v[1]
    if (v.length < 3)
	return version
    return version + '-' + v[2]
}
    
	


