(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})();


//filter scroll
const filters = document.getElementById("filters");

if (filters) {

    const leftBtn = document.querySelector(".left");
    const rightBtn = document.querySelector(".right");

    rightBtn.addEventListener("click", () => {
        filters.scrollBy({
            left: 300,
            behavior: "smooth"
        });
    });

    leftBtn.addEventListener("click", () => {
        filters.scrollBy({
            left: -300,
            behavior: "smooth"
        });
    });

    // Active Filter
    const allFilters = document.querySelectorAll(".filter");

    allFilters.forEach(filter => {
        filter.addEventListener("click", () => {

            allFilters.forEach(f => f.classList.remove("active"));

            filter.classList.add("active");

        });
    });

}