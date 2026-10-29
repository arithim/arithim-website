// Hero videos: play only while on screen, and not at all for people who ask for reduced motion (the poster frame stays).
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  function mount(v) {
    if (v.__hv) return;
    v.__hv = 1;
    if (reduce.matches) { v.removeAttribute('autoplay'); v.pause(); return; }
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) {
      var p = es[0].isIntersecting ? v.play() : v.pause();
      if (p && p.catch) p.catch(function () {});
    }, { threshold: 0.2 }).observe(v);
  }
  function scan() { [].forEach.call(document.querySelectorAll('video.ah-video-cv'), mount); }
  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
