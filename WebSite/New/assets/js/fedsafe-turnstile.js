(function(){
  var LOCAL_TEST_SITE_KEY = '1x00000000000000000000BB';
  var PRODUCTION_SITE_KEY = '';
  var SCRIPT_ID = 'cf-turnstile-api';
  var isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(window.location.hostname);
  var configuredKey = window.FEDSAFE_TURNSTILE_SITE_KEY || PRODUCTION_SITE_KEY || '';
  var siteKey = configuredKey || (isLocal ? LOCAL_TEST_SITE_KEY : '');
  var scriptPromise = null;

  function loadScript(){
    if(window.turnstile) return Promise.resolve();
    if(scriptPromise) return scriptPromise;

    scriptPromise = new Promise(function(resolve, reject){
      var existing = document.getElementById(SCRIPT_ID);

      if(existing){
        existing.addEventListener('load', function(){ resolve(); }, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      var script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = function(){ resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return scriptPromise;
  }

  function ensureHost(form){
    var host = form.querySelector('.fsr-turnstile-host');

    if(host) return host;

    host = document.createElement('div');
    host.className = 'fsr-turnstile-host';
    host.setAttribute('aria-hidden', 'true');
    host.style.position = 'absolute';
    host.style.left = '-9999px';
    host.style.width = '1px';
    host.style.height = '1px';
    host.style.overflow = 'hidden';
    form.appendChild(host);

    return host;
  }

  async function getToken(form){
    if(!siteKey){
      return '';
    }

    await loadScript();

    if(!window.turnstile){
      throw new Error('Human verification could not load. Please refresh the page and try again.');
    }

    return new Promise(function(resolve, reject){
      var host = ensureHost(form);
      var existingId = host.getAttribute('data-widget-id');

      if(existingId && window.turnstile.reset){
        window.turnstile.reset(existingId);
      }

      var timeout = window.setTimeout(function(){
        reject(new Error('Human verification timed out. Please try again.'));
      }, 12000);

      function done(token){
        window.clearTimeout(timeout);
        resolve(token);
      }

      function fail(){
        window.clearTimeout(timeout);
        reject(new Error('Human verification failed. Please try again.'));
      }

      try {
        var widgetId = existingId || window.turnstile.render(host, {
          sitekey: siteKey,
          size: 'invisible',
          callback: done,
          'error-callback': fail,
          'timeout-callback': fail
        });

        host.setAttribute('data-widget-id', widgetId);
        window.turnstile.execute(widgetId);
      } catch (error) {
        window.clearTimeout(timeout);
        reject(error);
      }
    });
  }

  window.fedsafeTurnstile = {
    getToken: getToken,
    isConfigured: function(){ return !!siteKey; }
  };
})();
