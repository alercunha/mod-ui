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

(function ($) {
    $.fn.xRunIndicator = function () {
        var self = $(this)
        self.hide()
        self.data('count', null)

        var timeout
        var poll = function () {
            var url = '/sysmon/xrun/'
            var count = self.data('count')
            if (count)
                url += count

            $.ajax({
                'url': url,
                'success': function (resp) {
                    if (resp && resp > count) {
                        self.data('count', resp)
                        self.html('XRUN! ' + resp % 100000)
                        self.show()
                        if (timeout)
                            clearTimeout(timeout)
                        timeout = setTimeout(function () {
                            self.hide()
                        }, 10000)
                    }
                    poll()
                },
                'error': function () {
                    setTimeout(function () {
                        poll()
                    }, 1000)
                },
                'dataType': 'json'
            })
        }
        poll()
    }
})(jQuery);