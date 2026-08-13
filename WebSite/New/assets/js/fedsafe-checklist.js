(function () {
  var TO_EMAIL  = 'mike@fedsaferetirement.com';
  var CC_EMAIL  = 'rgarcia350@gmail.com';

  var styleId = 'fsr-checklist-runtime-css';
  if (!document.getElementById(styleId)) {
    var s = document.createElement('style');
    s.id = styleId;
    s.textContent = [
      '#fsr-checklist-form{font-family:inherit}',
      '.fsr-cl-progress-wrap{margin-bottom:32px}',
      '.fsr-cl-progress-label{display:flex;justify-content:space-between;font-size:13px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;margin-bottom:10px;color:#555}',
      '.fsr-cl-progress-track{height:6px;background:rgba(0,0,0,.10);border-radius:99px;overflow:hidden}',
      '.fsr-cl-progress-bar{height:100%;background:linear-gradient(90deg,#1a3a6b,#2d6fd4);border-radius:99px;transition:width .45s cubic-bezier(.4,0,.2,1);width:0%}',
      '.fsr-cl-step{display:none}',
      '.fsr-cl-step.fsr-cl-active{display:block;animation:fsrFadeUp .3s ease both}',
      '@keyframes fsrFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}',
      '.fsr-cl-section-title{font-size:15px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#1a3a6b;border-bottom:2px solid #e0e6f0;padding-bottom:8px;margin:0 0 22px}',
      '.fsr-cl-fields-note{font-size:12px;color:#777;margin-bottom:18px;font-style:italic}',
      '.fsr-cl-grid{display:grid;gap:16px;grid-template-columns:1fr 1fr}',
      '.fsr-cl-grid.cols-1{grid-template-columns:1fr}',
      '.fsr-cl-grid.cols-4{grid-template-columns:1fr 1fr 1fr 1fr}',
      '@media(max-width:680px){.fsr-cl-grid,.fsr-cl-grid.cols-4{grid-template-columns:1fr}}',
      '.fsr-cl-field{display:flex;flex-direction:column;gap:5px}',
      '.fsr-cl-field label{font-size:13px;font-weight:600;color:#333;letter-spacing:.2px}',
      '.fsr-cl-field label .req{color:#c1272d;margin-left:2px}',
      '.fsr-cl-field input[type=text],.fsr-cl-field input[type=email],.fsr-cl-field input[type=tel],.fsr-cl-field textarea,.fsr-cl-field select{width:100%;padding:10px 13px;border:1px solid #d0d7e2;border-radius:8px;font-size:14px;font-family:inherit;background:#fff;color:#222;transition:border-color .2s,box-shadow .2s;box-sizing:border-box}',
      '.fsr-cl-field input:focus,.fsr-cl-field textarea:focus,.fsr-cl-field select:focus{outline:none;border-color:#2d6fd4;box-shadow:0 0 0 3px rgba(45,111,212,.12)}',
      '.fsr-cl-field textarea{resize:vertical;min-height:88px}',
      '.fsr-cl-checkgroup{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px}',
      '.fsr-cl-checkgroup label{display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:400!important;font-size:14px!important;background:#f5f7fb;border:1px solid #d0d7e2;border-radius:8px;padding:8px 14px;transition:all .15s;user-select:none}',
      '.fsr-cl-checkgroup label:hover{border-color:#2d6fd4;background:#edf3ff}',
      '.fsr-cl-checkgroup input[type=checkbox]{width:16px;height:16px;accent-color:#2d6fd4;margin:0}',
      '.fsr-cl-nav{display:flex;justify-content:space-between;align-items:center;margin-top:28px;gap:12px}',
      '.fsr-cl-nav-back{background:none;border:1px solid #d0d7e2;color:#555;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}',
      '.fsr-cl-nav-back:hover{border-color:#2d6fd4;color:#1a3a6b}',
      '.fsr-cl-nav-next,.fsr-cl-submit-btn{background:linear-gradient(135deg,#1a3a6b,#2d6fd4);color:#fff;border:none;padding:12px 30px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;transition:opacity .2s,transform .15s;font-family:inherit;margin-left:auto}',
      '.fsr-cl-nav-next:hover,.fsr-cl-submit-btn:hover{opacity:.88;transform:translateY(-1px)}',
      '.fsr-cl-submit-btn[disabled]{opacity:.65;cursor:wait;transform:none}',
      '.fsr-cl-honeypot{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;overflow:hidden!important}',
      '.fsr-cl-consent{font-size:12px;color:#777;line-height:1.6;margin-top:18px}',
      '.fsr-cl-success{display:none;text-align:center;padding:40px 24px;background:linear-gradient(135deg,#edf7ee,#d4edd6);border:1px solid #8bc98f;border-radius:12px;color:#1a5e1e;font-size:17px;font-weight:600;line-height:1.6}',
      '.fsr-cl-error{display:none;margin-top:14px;padding:13px 16px;border:1px solid #c1272d;border-radius:8px;background:#fff2f0;color:#8d1b1f;font-size:14px;font-weight:700}'
    ].join('');
    document.head.appendChild(s);
  }

  function val(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }
  function checkVals(form, name) {
    return Array.from(form.querySelectorAll('[name="' + name + '"]:checked'))
      .map(function (c) { return c.value; }).join(', ');
  }
  function showErr(form, msg) {
    var el = form.querySelector('.fsr-cl-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    else alert(msg);
  }

  document.querySelectorAll('form[data-fsr-checklist]').forEach(function (form) {
    var steps   = Array.from(form.querySelectorAll('.fsr-cl-step'));
    var total   = steps.length;
    var current = 0;
    var bar     = form.querySelector('.fsr-cl-progress-bar');
    var lbl     = form.querySelector('.fsr-cl-step-label');

    function updateProgress() {
      var pct = Math.round((current / total) * 100);
      if (bar) bar.style.width = pct + '%';
      if (lbl) lbl.textContent = 'Step ' + (current + 1) + ' of ' + total;
    }
    function showStep(idx) {
      steps.forEach(function (s, i) { s.classList.toggle('fsr-cl-active', i === idx); });
      updateProgress();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function validateStep(idx) {
      var ok = true;
      steps[idx].querySelectorAll('[required]').forEach(function (el) {
        el.style.borderColor = '';
        if (!el.value.trim()) { el.style.borderColor = '#c1272d'; if (ok) el.focus(); ok = false; }
      });
      return ok;
    }

    form.querySelectorAll('.fsr-cl-nav-next').forEach(function (btn) {
      btn.addEventListener('click', function () { if (validateStep(current)) { current++; showStep(current); } });
    });
    form.querySelectorAll('.fsr-cl-nav-back').forEach(function (btn) {
      btn.addEventListener('click', function () { current--; showStep(current); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateStep(current)) return;

      // Honeypot — bail silently if bot filled hidden field
      if (val(form, 'website')) return;

      var firstName = val(form, 'firstName');
      var lastName  = val(form, 'lastName');

      var body = [
        'FEDERAL RETIREMENT READINESS CHECKLIST',
        'Submitted: ' + new Date().toLocaleString(),
        '',
        '--- CONTACT ---',
        'Name:       ' + firstName + ' ' + lastName,
        'Email:      ' + val(form, 'personalEmail'),
        'Cell Phone: ' + val(form, 'cellPhone'),
        '',
        '--- 1) CAREER & ELIGIBILITY ---',
        'Agency:             ' + (val(form, 'federalAgency') || '—'),
        'Position/Role:      ' + (val(form, 'positionRole') || '—'),
        'Service Comp Date:  ' + (val(form, 'serviceCompDate') || '—'),
        'Years of Service:   ' + (val(form, 'yearsOfService') || '—'),
        'Retirement System:  ' + (checkVals(form, 'retirementSystem') || '—'),
        'Special Provisions: ' + (checkVals(form, 'specialProvisions') || '—'),
        '',
        '--- 2) TIMING ---',
        'Target Retirement Date:  ' + (val(form, 'targetRetirementDate') || '—'),
        'Deadlines/Constraints:   ' + (val(form, 'deadlinesConstraints') || '—'),
        '',
        '--- 3) TSP ---',
        'TSP Balance:      ' + (val(form, 'tspBalance') || '—'),
        'TSP Allocation:   ' + (val(form, 'tspAllocation') || '—'),
        'Contribution %:   ' + (val(form, 'tspContribution') || '—'),
        'Traditional/Roth: ' + (checkVals(form, 'tspRothMix') || '—'),
        '',
        '--- 4) HEALTHCARE & INSURANCE ---',
        'FEHB Plan:       ' + (val(form, 'fehbPlan') || '—'),
        'Medicare Status: ' + (checkVals(form, 'medicareStatus') || '—'),
        'FEGLI Coverage:  ' + (checkVals(form, 'fegliCoverage') || '—'),
        '',
        '--- 5) SOCIAL SECURITY ---',
        'SSA Account Status: ' + (checkVals(form, 'ssaAccountStatus') || '—'),
        'SS Start Age:       ' + (val(form, 'ssaStartAge') || '—'),
        '',
        '--- 6) TAX PICTURE ---',
        'Tax Bracket:          ' + (val(form, 'taxBracket') || '—'),
        'Other Income Sources: ' + (val(form, 'otherIncomeSources') || '—'),
        'Tax Concerns:         ' + (val(form, 'taxConcerns') || '—'),
        '',
        '--- 7) GOALS & PRIORITIES ---',
        'Top Goals:',
        val(form, 'topGoals') || '—',
        '',
        'Biggest Concerns:',
        val(form, 'biggestConcerns') || '—',
        '',
        'What Would Make This a Win:',
        val(form, 'engagementWin') || '—',
        '',
        '--- META ---',
        'Page: ' + window.location.href,
        'Referrer: ' + (document.referrer || '—')
      ].join('\n');

      var subject = 'Retirement Checklist: ' + firstName + ' ' + lastName;
      var mailto  = 'mailto:' + TO_EMAIL
        + '?cc=' + encodeURIComponent(CC_EMAIL)
        + '&subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);

      window.location.href = mailto;

      // Show success after a short delay (email client opens)
      setTimeout(function () {
        var formBody = form.querySelector('.fsr-cl-form-body');
        if (formBody) formBody.style.display = 'none';
        var suc = form.querySelector('.fsr-cl-success');
        if (suc) { suc.style.display = 'block'; suc.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      }, 800);
    });

    showStep(0);
  });
})();
