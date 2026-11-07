/* Alpha-Seeker — ui/newsletter.js
   Moved from the second <script> block at Alpha-Seeker.html lines 2831-2855.
   The body is unchanged apart from being wrapped in an exported init function
   and importing showToast instead of reaching through window.showToast (module
   scope is not global, so the old window lookup would always have missed). */

import { showToast } from './toast.js';

export function initNewsletter() {
  // Newsletter signup. Two ways to collect addresses:
  //  A) Paste your Substack/beehiiv embed into the .nl-card (replace the form).
  //  B) Keep the form: set NL_ENDPOINT to a Formspree/provider POST URL, or
  //     leave it blank to use the mailto fallback (opens visitor's email client).
  var NL_ENDPOINT = "";
  var NL_EMAIL = "you@yourdomain.com";
  var f = document.getElementById('nlForm');
  if(!f) return;
  function toast(m){ showToast(m); }
  function nlMail(d){
    toast("Opening your email to confirm\u2026");
    var body = "Please add me to The Alpha Seeker Weekly.%0D%0A%0D%0AEmail: "+(d.email||"")+"%0D%0AName: "+(d.name||"");
    window.location.href = "mailto:"+NL_EMAIL+"?subject=Subscribe to The Alpha Seeker Weekly&body="+body;
  }
  f.addEventListener('submit', function(e){
    e.preventDefault();
    var d = Object.fromEntries(new FormData(f).entries());
    if(NL_ENDPOINT){
      fetch(NL_ENDPOINT,{method:'POST',body:new FormData(f),headers:{'Accept':'application/json'}})
        .then(function(){ toast("You're on the list \u2014 see you Monday."); f.reset(); })
        .catch(function(){ nlMail(d); });
    } else { nlMail(d); }
  });
}
