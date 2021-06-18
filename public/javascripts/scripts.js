// const btn = document.getElementById('addBtn')
//
// const selectItem = document.getElementById('quantity')
// selectItem.addEventListener('onchange', () => {
//     // console.log(selectItem.value)
// })
//
// btn.addEventListener('click', () => {
//     console.log()
// })

const addToCart = (item) => {
    console.log(item)
    let cartItems = localStorage.getItem('cartItems');
    if(cartItems) {
        cartItems = JSON.parse(cartItems)
        const newItemsList = [...cartItems, item]
        localStorage.setItem('cartItems', JSON.stringify(newItemsList))
    } else {
        localStorage.setItem('cartItems', JSON.stringify([item]))
    }
}

const removeToCart = (itemId) => {
    let cartItems = localStorage.getItem('cartItems');
    if(cartItems) {
        cartItems = JSON.parse(cartItems)
        const newItemsList = cartItems.filter(item => item._id !== itemId)
        localStorage.setItem('cartItems', JSON.stringify(newItemsList))
    }
}

const getNumberOfCartItems = () => {
    let cartItems = localStorage.getItem('cartItems');
    if(cartItems) {
        cartItems = JSON.parse(cartItems)
        return cartItems.length
    } else return 0
}

//Notifications

function showAlert(){
    document.getElementById('addedToCart').classList.add("showAlert")
    // if (btn_alert.style.visibility === "hidden"){
    //     btn_alert.style.visibility = "visible"
    // }
}














// $('.modal-trigger').on('click',function(e){
//     const price = $(this)[0].dataset.price;
//     const description = $(this)[0].dataset.description;
//     const name = $(this)[0].dataset.name;
//     $('#item-price').html(price);
//     $('#item-description').html(description);
//     $('#item-name').html(name);
// })