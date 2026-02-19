if (typeof $.validator !== "undefined") {
   $.validator.setDefaults({
      ignore: [],
      errorClass: "text-danger small mt-1",
      highlight: function (element) {
         if ($(element).is(":checkbox") && $(element).closest("[data-grupo-validacion]").length) {
               $(element).closest("[data-grupo-validacion]")
                  .addClass("border border-danger rounded p-1");
         } else {
               $(element).addClass("is-invalid");
         }
      },
      unhighlight: function (element) {
         if ($(element).is(":checkbox") && $(element).closest("[data-grupo-validacion]").length) {
               $(element).closest("[data-grupo-validacion]")
                  .removeClass("border border-danger rounded p-1");
         } else {
               $(element).removeClass("is-invalid");
         }
      },
      invalidHandler: function (event, validator) {
         if (!validator.errorList.length) return;
         const firstError    = $(validator.errorList[0].element);
         const offcanvasBody = $(".offcanvas.show .offcanvas-body");
         if (offcanvasBody.length) {
               offcanvasBody.animate({
                  scrollTop: firstError.offset().top
                           - offcanvasBody.offset().top
                           + offcanvasBody.scrollTop()
                           - 40
               }, 400);
         } else {
               $("html, body").animate({ scrollTop: firstError.offset().top - 100 }, 400);
         }
         firstError.trigger("focus");
      }
   });
}