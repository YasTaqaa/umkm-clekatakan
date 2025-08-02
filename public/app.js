const productList = document.getElementById("product-cards");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
let allProducts = []; 

function isValidImageUrl(url) {
  return (
    /^https?:\/\//.test(url) ||
    url.startsWith('/uploads/')
  );
}

// render produk ke DOM
function renderProducts(productsToRender) {
  if (!productList) return;

  productList.innerHTML = "";

  if (productsToRender.length === 0) {
    productList.innerHTML =
      "<p class='no-products'>Tidak ada produk yang ditemukan.</p>";
    return;
  }

  productsToRender.forEach((product) => {
    const card = document.createElement("div");
    card.className = "card";

    const imageUrl = product.image;

    const imageTag = isValidImageUrl(imageUrl)
      ? `<img src="${imageUrl}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"/><div class="no-image" style="display: none;">[Gambar tidak dapat dimuat]</div>`
      : `<div class="no-image">[Gambar tidak tersedia]</div>`;

    card.innerHTML = `
      ${imageTag}
      <h3>${product.name}</h3>
      <p><strong>Deskripsi:</strong> ${product.description}</p>
      <p><strong>Kontak:</strong> ${product.contact}</p>
    `;
    productList.appendChild(card);
  });
}

// gambil produk 
async function loadProducts() {
  if (!productList) return;

  const response = await fetch('/api/products');
  const data = await response.json();
  allProducts = data; 
  
  renderProducts(allProducts); 
}

// pencarian
function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase();
  const filteredProducts = allProducts.filter(product => {
    return product.name.toLowerCase().includes(searchTerm) ||
           product.description.toLowerCase().includes(searchTerm);
  });
  renderProducts(filteredProducts);
}

searchButton.addEventListener('click', handleSearch);

searchInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    handleSearch();
  }
});

window.onload = function () {
  loadProducts();
};