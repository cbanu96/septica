$(function(){
  // tooltip initialization
  (function() {
    $(document.body).tooltip({ selector: "[rel='tooltip']" });
  })();
  

  // image preloading
  (function(images) {
    images.forEach(function(src) {
      $("<img />").attr('src', src).appendTo('body').css('display', 'none').hide();
    });
  })(["img/13D.png",
      "img/11D.png", 
      "img/13H.png", 
      "img/7C.png", 
      "img/10S.png", 
      "img/10H.png", 
      "img/13S.png", 
      "img/9C.png", 
      "img/14H.png", 
      "img/14D.png", 
      "img/9H.png", 
      "img/14S.png", 
      "img/12D.png", 
      "img/8C.png", 
      "img/12S.png", 
      "img/9S.png", 
      "img/10C.png", 
      "img/9D.png", 
      "img/11H.png", 
      "img/12C.png", 
      "img/10D.png", 
      "img/8H.png", 
      "img/13C.png", 
      "img/11C.png", 
      "img/7H.png", 
      "img/8D.png", 
      "img/7D.png", 
      "img/7S.png", 
      "img/11S.png", 
      "img/14C.png", 
      "img/8S.png", 
      "img/12H.png"]);

  $('body').fadeIn(0);
});
