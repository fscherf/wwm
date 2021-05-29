var WWM = {};

WWM.WINDOW_TEMLPATE = `
  <div class="wwm-window-title-bar">
    <div class="wwm-window-title-bar-title">
      Title
    </div>
    <div class="wwm-window-title-bar-actions">
      <span class="wwm-window-action-refresh" title="Refresh">[r]</span>
      <span class="wwm-window-action-close" title="Close">[X]</span>
    </div>
  </div>

  <div class="wwm-window-body">
    Body
  </div>

  <div class="wwm-window-resizer wwm-window-resize-w"></div>
  <div class="wwm-window-resizer wwm-window-resize-e"></div>
  <div class="wwm-window-resizer wwm-window-resize-s"></div>
  <div class="wwm-window-resizer wwm-window-resize-sw"></div>
  <div class="wwm-window-resizer wwm-window-resize-se"></div>
`;


WWM.get_cookie = function(name) {
    var name = name + '=';
    var cookies = decodeURIComponent(document.cookie).split(';');

    for(var index = 0; index < cookies.length; index++) {
        var cookie = cookies[index];

        while (cookie.charAt(0) == ' ') {
            cookie = cookie.substring(1);
        }

        if (cookie.indexOf(name) == 0) {
            return cookie.substring(name.length, cookie.length);
        };

    };

    return '';
}


WWM.set_cookie = function(name, value, expire_days) {
    var date = new Date();

    date.setTime(date.getTime() + (expire_days*24*60*60*1000));

    document.cookie = (
        name + '=' + value + ';expires=' + date.toUTCString() + ';path=/');
}


WWM.WindowManager = function(root_element, lona_context, settings) {
    this.root_element = root_element;
    this.lona_context = lona_context;

    this.settings = settings || {
        cookie_name: 'wwm',
    };

    // setup ------------------------------------------------------------------
    this.windows = [];

    // methods ----------------------------------------------------------------
    this._spawn_window = function(url) {
        var _window = new WWM.Window(this, url);

        this.windows.push(_window);

        return _window;
    };

    this.spawn_window = function(url) {
        this._spawn_window(url);
        this.save_state();
    };

    this.get_window_state = function() {
        var window_state = [];

        this.windows.forEach(function(_window) {
            var client_rect = _window.window_element.getClientRects()[0];

            window_state.push({
                width: client_rect.width,
                height: client_rect.height,
                left: client_rect.left,
                top: client_rect.top,
                zIndex: _window.window_element.style.zIndex,
            });
        });

        return window_state;
    };

    this.save_state = function() {
        var cookie = WWM.get_cookie(this.settings.cookie_name);

        var default_cookie =  {
            window_state: [],
        };

        if(cookie) {
            try {
                cookie = JSON.parse(cookie);

            } catch {
                cookie = default_cookie;

            };

        } else {
            cookie = default_cookie;

        };

        cookie.window_state = this.get_window_state();

        WWM.set_cookie(this.settings.cookie_name, JSON.stringify(cookie));
    };

    this.load_state = function() {
        var cookie = WWM.get_cookie(this.settings.cookie_name);

        if(!cookie) {
            return;
        };

        cookie = JSON.parse(cookie);

        for(var index=0; index<cookie.window_state.length; index++) {
            var state = cookie.window_state[index];
            var _window = this._spawn_window();

            _window.set_state(state);
        };
    };
};


WWM.Window = function(window_manager, url) {
    this.window_manager = window_manager;

    this._current_resizer;

    // setup ------------------------------------------------------------------
    var _window = this;

    // create window
    this.window_element = document.createElement('div');

    this.window_element.classList.add('wwm-window');
    this.window_element.innerHTML = WWM.WINDOW_TEMLPATE;

    // move to top
    this.window_element.addEventListener('mousedown', function(event) {
        // skip if click was no left click
        if(event.which != 1) {
            return;
        };

        var window_elements = Array.from(
            _window.window_manager.root_element.querySelectorAll('.wwm-window')
        );

        window_elements = window_elements.sort(function(a, b) {
            if(a.style.zIndex < b.style.zIndex) {
                return -1;
            };

            if(a.style.zIndex > b.style.zIndex) {
                return 1;
            };

            return 0;
        });

        window_elements.forEach(function(window_element, index) {
            if(window_element == _window.window_element) {
                window_element.style.zIndex = window_elements.length;

            } else {;
                window_element.style.zIndex = index;

            };
        });

        _window.window_manager.save_state();
    });

    // move
    this.move_handle = this.window_element.querySelector(
        '.wwm-window-title-bar');

    function _move(event) {
        var element = _window.window_element;
        var client_rect = element.getClientRects()[0];

        element.style.left = (
            ((parseInt(element.style.left) || client_rect.left) +
             event.movementX) + 'px'
        );

        element.style.top = (
            ((parseInt(element.style.top) || client_rect.top) +
             event.movementY) + 'px'
        );
    };

    function _move_stop(event) {
        window.removeEventListener('mousemove', _move);
        window.removeEventListener('mouseup', _move_stop);

        _window.window_manager.save_state();
    };

    this.move_handle.addEventListener('mousedown', function(event) {
        // skip if click was no left click
        if(event.which != 1) {
            return;
        };

        window.addEventListener('mousemove', _move);
        window.addEventListener('mouseup', _move_stop);
    });

    this.window_element.addEventListener('mousedown', function(event) {
        // skip if click was no left click
        if(event.which != 1) {
            return;
        };

        // skip if CTRL is not pressed
        if(!event.shiftKey) {
            return;
        };

        window.addEventListener('mousemove', _move);
        window.addEventListener('mouseup', _move_stop);
    });

    // resize
    function _resize(event) {
        var element = _window.window_element;
        var client_rect = element.getClientRects()[0];
        var current_resizer = _window._current_resizer;

        var resize_left = false;
        var resize_right = false;
        var resize_bottom = false;

        if(current_resizer.classList.contains('wwm-window-resize-w') ||
           current_resizer.classList.contains('wwm-window-resize-sw')) {

            resize_left = true;
        };

        if(current_resizer.classList.contains('wwm-window-resize-e') ||
           current_resizer.classList.contains('wwm-window-resize-se')) {

            resize_right = true;
        };

        if(current_resizer.classList.contains('wwm-window-resize-s') ||
           current_resizer.classList.contains('wwm-window-resize-sw') ||
           current_resizer.classList.contains('wwm-window-resize-se')) {

            resize_bottom = true;
        };

        if(resize_left) {
            element.style.left = (
                ((parseInt(element.style.left) || client_rect.left) +
                 event.movementX) + 'px'
            );

            element.style.width = (
                ((parseInt(element.style.width) || client_rect.width) +
                 (event.movementX * -1)) + 'px'
            );
        };

        if(resize_right) {
            element.style.width = (
                ((parseInt(element.style.width) || client_rect.width) +
                 event.movementX) + 'px'
            );
        };

        if(resize_bottom) {
            element.style.height = (
                ((parseInt(element.style.height) || client_rect.height) +
                 event.movementY) + 'px'
            );
        };
    };

    function _resize_stop(event) {
        window.removeEventListener('mousemove', _resize);
        window.removeEventListener('mouseup', _resize_stop);

        _window.window_manager.save_state();
    };

    var resizers = this.window_element.querySelectorAll('.wwm-window-resizer');

    resizers.forEach(function(resizer) {
        resizer.addEventListener('mousedown', function(event) {
            // skip if click was no left click
            if(event.which != 1) {
                return;
            };

            _window._current_resizer = resizer;

            window.addEventListener('mousemove', _resize);
            window.addEventListener('mouseup', _resize_stop);
        });
    });

    // refresh
    var close_button = this.window_element.querySelector(
        '.wwm-window-action-refresh');

    close_button.addEventListener('click', function(event) {
        _window.refresh();
    });

    // close
    var close_button = this.window_element.querySelector(
        '.wwm-window-action-close');

    close_button.addEventListener('click', function(event) {
        _window.close();
    });

    // append window to winodw root
    this.window_manager.root_element.appendChild(this.window_element);

    // methods ----------------------------------------------------------------
    this.set_state = function(state) {
        this.window_element.style.width = state.width;
        this.window_element.style.height = state.height;
        this.window_element.style.left = state.left;
        this.window_element.style.top = state.top;
        this.window_element.style.zIndex = state.zIndex;
    };

    this.move_to_top = function() {

    };

    this.close = function() {
        this.window_element.remove();

        this.window_manager.windows.splice(
            this.window_manager.windows.indexOf(this), 1);

        this.window_manager.save_state();
    };

    this.refresh = function() {
        console.log('refresh');
    };
};
