(() => {
  "use strict";

  /* =========================================================
     ZIMSHOP — MAIN JAVASCRIPT
     ========================================================= */

  const WHATSAPP = "263787863923";
  const STORAGE_KEY = "zimshop_cart_v2";


  /* =========================================================
     HELPERS
     ========================================================= */

  const $ = (selector) => document.querySelector(selector);

  const $$ = (selector) => [
    ...document.querySelectorAll(selector)
  ];

  const money = (value) =>
    Number(value).toFixed(2);


  function escapeHtml(value) {
    return String(value).replace(
      /[&<>"']/g,
      (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[character]
    );
  }


  /* =========================================================
     GOOGLE ANALYTICS
     ========================================================= */

  function track(eventName, parameters = {}) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, parameters);
    }
  }


  /* =========================================================
     CART
     ========================================================= */

  let cart = [];


  function loadCart() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      if (!Array.isArray(saved)) {
        cart = [];
        return;
      }

      cart = saved
        .filter((item) => {
          return (
            item &&
            item.name &&
            Number(item.price) >= 0 &&
            Number(item.quantity) > 0
          );
        })
        .map((item) => ({
          name: String(item.name),
          price: Number(item.price),
          quantity: Math.floor(Number(item.quantity))
        }));

    } catch (error) {
      console.warn("Could not load cart:", error);
      cart = [];
    }
  }


  function saveCart() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(cart)
      );
    } catch (error) {
      console.warn("Could not save cart:", error);
    }
  }


  function getCartCount() {
    return cart.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }


  function getCartTotal() {
    return cart.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }


  function updateCart() {

    const countElement = $("#cart-count");
    const totalElement = $("#cart-total");
    const itemsElement = $("#cart-items");

    const count = getCartCount();
    const total = getCartTotal();


    if (countElement) {
      countElement.textContent = count;
    }


    if (totalElement) {
      totalElement.textContent = money(total);
    }


    if (!itemsElement) {
      return;
    }


    if (cart.length === 0) {

      itemsElement.innerHTML = `
        <div class="cart-empty">
          <span>🛒</span>
          <p>Your cart is empty.</p>
          <small>
            Add a product above to get started.
          </small>
        </div>
      `;

      return;
    }


    itemsElement.innerHTML = cart
      .map((item, index) => {

        const itemTotal =
          item.price * item.quantity;

        return `
          <div class="cart-item">

            <div>
              <div class="cart-item-name">
                ${escapeHtml(item.name)}
              </div>

              <div class="cart-item-price">
                $${money(item.price)} each
              </div>
            </div>


            <div class="qty-controls">

              <button
                type="button"
                data-action="decrease"
                data-index="${index}"
                aria-label="Decrease ${escapeHtml(item.name)}"
              >
                −
              </button>

              <strong>
                ${item.quantity}
              </strong>

              <button
                type="button"
                data-action="increase"
                data-index="${index}"
                aria-label="Increase ${escapeHtml(item.name)}"
              >
                +
              </button>

            </div>


            <strong>
              $${money(itemTotal)}
            </strong>


            <button
              type="button"
              class="remove-item"
              data-action="remove"
              data-index="${index}"
            >
              Remove
            </button>

          </div>
        `;

      })
      .join("");
  }


  /* =========================================================
     ADD TO CART
     ========================================================= */

  $$(".add-to-cart").forEach((button) => {

    button.addEventListener("click", () => {

      const name =
        button.dataset.name;

      const price =
        Number(button.dataset.price);


      if (!name || !Number.isFinite(price)) {
        return;
      }


      const existing =
        cart.find(
          (item) => item.name === name
        );


      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({
          name,
          price,
          quantity: 1
        });
      }


      saveCart();
      updateCart();


      track("add_to_cart", {
        item_name: name,
        value: price,
        currency: "USD"
      });


      const originalText =
        button.textContent;


      button.textContent =
        "Added ✓";


      button.disabled = true;


      setTimeout(() => {

        button.textContent =
          originalText;

        button.disabled = false;

      }, 900);

    });

  });


  /* =========================================================
     CART CONTROLS
     ========================================================= */

  document.addEventListener("click", (event) => {

    const button =
      event.target.closest("[data-action]");


    if (!button) {
      return;
    }


    const index =
      Number(button.dataset.index);

    const action =
      button.dataset.action;


    if (!Number.isInteger(index) || !cart[index]) {
      return;
    }


    const item =
      cart[index];


    if (action === "increase") {

      item.quantity += 1;

    }


    if (action === "decrease") {

      item.quantity -= 1;

      if (item.quantity <= 0) {
        cart.splice(index, 1);
      }

    }


    if (action === "remove") {

      track("remove_from_cart", {
        item_name: item.name
      });

      cart.splice(index, 1);

    }


    saveCart();
    updateCart();

  });


  /* =========================================================
     CLEAR CART
     ========================================================= */

  const clearCart =
    $("#clear-cart");


  if (clearCart) {

    clearCart.addEventListener(
      "click",
      () => {

        if (cart.length === 0) {
          return;
        }


        cart = [];

        saveCart();
        updateCart();

        track("clear_cart");

      }
    );

  }


  /* =========================================================
     PRODUCT SEARCH
     ========================================================= */

  const searchBox =
    $("#searchBox");


  function applySearch() {

    if (!searchBox) {
      return;
    }


    const query =
      searchBox.value
        .trim()
        .toLowerCase();


    const products =
      $$("[data-product-grid] .product");


    let visibleCount = 0;


    products.forEach((product) => {

      const title =
        product.querySelector("h3")
          ?.textContent || "";


      const description =
        product.querySelector("p")
          ?.textContent || "";


      const category =
        product.dataset.category || "";


      const searchableText =
        `${title} ${description} ${category}`
          .toLowerCase();


      const matches =
        !query ||
        searchableText.includes(query);


      product.hidden =
        !matches;


      if (matches) {
        visibleCount += 1;
      }

    });


    const results =
      $("#searchResults");


    if (results) {

      if (query) {

        results.textContent =
          `${visibleCount} product${
            visibleCount === 1 ? "" : "s"
          } found`;

      } else {

        results.textContent =
          `${visibleCount} products available`;

      }

    }


    const emptyState =
      $("[data-search-empty]");


    if (emptyState) {

      emptyState.hidden =
        visibleCount !== 0;

    }


    const clearSearch =
      $("#clearSearch");


    if (clearSearch) {

      clearSearch.hidden =
        !searchBox.value;

    }

  }


  if (searchBox) {

    searchBox.addEventListener(
      "input",
      () => {

        applySearch();

        const searchTerm =
          searchBox.value.trim();


        if (searchTerm) {

          track("search", {
            search_term: searchTerm
          });

        }

      }
    );


    applySearch();

  }


  /* =========================================================
     CLEAR SEARCH
     ========================================================= */

  const clearSearch =
    $("#clearSearch");


  if (clearSearch && searchBox) {

    clearSearch.addEventListener(
      "click",
      () => {

        searchBox.value = "";

        applySearch();

        searchBox.focus();

      }
    );

  }


  /* =========================================================
     WHATSAPP ORDER
     ========================================================= */

  const whatsappOrder =
    $("#whatsapp-order");


  if (whatsappOrder) {

    whatsappOrder.addEventListener(
      "click",
      () => {

        if (cart.length === 0) {

          alert(
            "Your cart is empty. Add a product first."
          );

          return;
        }


        const lines = [
          "Hello ZimShop! I would like to order:",
          ""
        ];


        let total = 0;


        cart.forEach((item) => {

          const itemTotal =
            item.price * item.quantity;


          total += itemTotal;


          lines.push(
            `${item.name} x ${item.quantity} - $${money(itemTotal)}`
          );

        });


        lines.push(
          "",
          `Total: $${money(total)}`
        );


        const message =
          encodeURIComponent(
            lines.join("\n")
          );


        const url =
          `https://wa.me/${WHATSAPP}?text=${message}`;


        track("whatsapp_order", {
          value: total,
          currency: "USD",
          items: cart.length
        });


        window.open(
          url,
          "_blank",
          "noopener"
        );

      }
    );

  }


  /* =========================================================
     CONTACT FORM
     ========================================================= */

  const contactForm =
    $("#contactForm");


  if (contactForm) {

    contactForm.addEventListener(
      "submit",
      (event) => {

        event.preventDefault();


        const name =
          $("#contactName")
            ?.value
            .trim() || "";


        const email =
          $("#contactEmail")
            ?.value
            .trim() || "";


        const message =
          $("#contactMessage")
            ?.value
            .trim() || "";


        if (!name || !message) {
          return;
        }


        const lines = [
          "Hello ZimShop!",
          "",
          `Name: ${name}`
        ];


        if (email) {
          lines.push(
            `Email: ${email}`
          );
        }


        lines.push(
          "",
          message
        );


        const url =
          `https://wa.me/${WHATSAPP}?text=${
            encodeURIComponent(lines.join("\n"))
          }`;


        track(
          "contact_whatsapp",
          {
            method: "contact_form"
          }
        );


        window.open(
          url,
          "_blank",
          "noopener"
        );

      }
    );

  }


  /* =========================================================
     GENERAL ANALYTICS TRACKING
     ========================================================= */

  $$("[data-track]").forEach((element) => {

    element.addEventListener(
      "click",
      () => {

        const eventName =
          element.dataset.track;


        if (eventName) {

          track(eventName);

        }

      }
    );

  });


  /* =========================================================
     INITIALIZE
     ========================================================= */

  loadCart();

  updateCart();

})();
