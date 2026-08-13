(function(){
  var endpoint = 'https://fedsafe-retirement.vercel.app/api/public/website-lead';
  var styleId = 'fsr-lead-form-runtime-css';

  if(!document.getElementById(styleId)){
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      '.fsr-submit-btn[disabled]{cursor:wait!important;opacity:.72!important;}',
      '.fsr-honeypot{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;overflow:hidden!important;}',
      '.fsr-form-error{display:none;margin-top:10px!important;padding:14px 16px!important;border:1px solid #c1272d!important;border-radius:6px!important;background:#fff2f0!important;color:#8d1b1f!important;font-family:inherit!important;font-size:15px!important;font-weight:700!important;}'
    ].join('');
    document.head.appendChild(style);
  }

  function value(form, name){
    var field = form.querySelector('[name="' + name + '"]');
    return field ? field.value.trim() : '';
  }

  function showError(form, message){
    var success = form.querySelector('.fsr-success');
    var error = form.querySelector('.fsr-form-error');

    if(success) success.style.display = 'none';

    if(error){
      error.textContent = message || 'Something went wrong. Please try again.';
      error.style.display = 'block';
      error.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      alert(message || 'Something went wrong. Please try again.');
    }
  }

  function showSuccess(form){
    var success = form.querySelector('.fsr-success');
    var error = form.querySelector('.fsr-form-error');

    if(error) error.style.display = 'none';
    if(success){
      success.style.display = 'block';
      success.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function payloadFromForm(form){
    return {
      formType: form.getAttribute('data-form-type') || 'generic',
      firstName: value(form, 'firstName'),
      lastName: value(form, 'lastName'),
      cellPhone: value(form, 'cellPhone'),
      personalEmail: value(form, 'personalEmail'),
      dateOfBirth: value(form, 'dateOfBirth'),
      federalAgency: value(form, 'federalAgency'),
      yearsOfService: value(form, 'yearsOfService'),
      numberOfEmployees: value(form, 'numberOfEmployees'),
      questionsComments: value(form, 'questionsComments'),
      sourcePage: window.location.href,
      referrer: document.referrer,
      smsConsent: true,
      turnstileToken: form.getAttribute('data-turnstile-token') || '',
      website: value(form, 'website')
    };
  }

  document.querySelectorAll('form[data-fsr-lead-form]').forEach(function(form){
    form.addEventListener('submit', async function(event){
      event.preventDefault();

      if(typeof form.reportValidity === 'function' && !form.reportValidity()){
        return;
      }

      var button = form.querySelector('.fsr-submit-btn');
      var originalText = button ? button.textContent : '';

      if(button){
        button.disabled = true;
        button.textContent = 'Verifying...';
      }

      try {
        if(!window.fedsafeTurnstile){
          throw new Error('Human verification could not load. Please refresh the page and try again.');
        }

        form.setAttribute('data-turnstile-token', await window.fedsafeTurnstile.getToken(form));

        if(button){
          button.textContent = 'Submitting...';
        }

        var response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadFromForm(form))
        });
        var result = await response.json().catch(function(){ return {}; });

        if(response.ok && result.ok){
          form.reset();
          showSuccess(form);
        } else {
          showError(form, result.error || 'Something went wrong. Please try again.');
        }
      } catch (error) {
        showError(form, 'Unable to submit right now. Please try again.');
      } finally {
        if(button){
          button.disabled = false;
          button.textContent = originalText || 'Submit';
        }
      }
    });
  });
})();
