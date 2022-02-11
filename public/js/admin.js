const deleteProduct = (btn) => {
  const prodId = btn.parentNode.querySelector("[name=productId]").value;
  const csrf = btn.parentNode.querySelector("[name=_csrf]").value;

  const parentElement = btn.closest("article");
  fetch("/admin/products/" + prodId, {
    method: "DELETE",
    headers: {
      "csrf-token": csrf,
    },
  })
    .then((result) => {
      //console.log(result);
      parentElement.parentNode.removeChild(parentElement);
    })
    .catch((err) => {
      console.log(err);
    });
};
