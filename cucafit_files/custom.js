(function ($) {

    "use strict";

    // PRE LOADER
    $(window).load(function () {
        $('.preloader').fadeOut(1000); // set duration in brackets
    });


    //Navigation Section
    $('.navbar-collapse a').on('click', function () {
        $(".navbar-collapse").collapse('hide');
    });


    // Owl Carousel
    $('.owl-carousel').owlCarousel({
        animateOut: 'fadeOut',
        items: 1,
        loop: true,
        autoplay: true,
    })


    // PARALLAX EFFECT
    $.stellar();


    // SMOOTHSCROLL
    $(function () {
        $('.navbar-default a, #home a, footer a').on('click', function (event) {
            var $anchor = $(this);
            $('html, body').stop().animate({
                scrollTop: $($anchor.attr('href')).offset().top - 49
            }, 1000);
            event.preventDefault();
        });
    });


    // WOW ANIMATION
    new WOW({mobile: false}).init();

    $("#appointment-form").submit(function (e) {
        e.preventDefault();
        const f = new FormData(e.target);
      const name = f.get("name");
      const message = f.get("message");
      const date = f.get("date");
      const phone = f.get("phone");
      const WHATSAPP = document.getElementById("WHATSAPP");
      WHATSAPP.href = `https://wa.me/919899900143?text=Hi, I am ${name},%0aI am seeking an appointment for ${date}%0a%0a${message}%0a%0a-${name} (Mobile: ${phone})`;
      WHATSAPP.click();
    });
})(jQuery);
