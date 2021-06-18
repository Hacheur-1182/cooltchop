require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const Schema = require("mongoose");
const Item = require('./models/items')
const Order = require("./models/order");
require('./models/db')
const path = require("path");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const router = express.Router();

router.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    // cookie: {secure: true}
}));

router.use(passport.initialize(undefined));
router.use(passport.session(undefined));


/* get connection on database*/

/*Create Schemas and Collections*/

//users registration
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    password: String,
        cart: {
            items: [
                    {
                        itemId: { type: Schema.Types.ObjectId, ref: "Items"},
                        quantity: { type: Number }
                    }
                ]
        }
}, {timestamps: true})

//Instance method to remove cart
userSchema.methods.removeFromCart = function(id) {
    this.cart.items = this.cart.items.filter(item => {
        return item.itemId.toString() !== id.toString();
    });
    return this.save();
};
//Instance method to clear cart
userSchema.methods.clearCart = function() {
    this.cart = { items: [] };
    return this.save();
};


userSchema.plugin(passportLocalMongoose)

const User = new mongoose.model('Users', userSchema)

passport.use('local',User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});


/* GET home page. */
let userId = ""
router.route('/login')
    .get( function (req, res) {
    res.render('login')
})
    .post(function (req,res) {
        userId = req.body.username
    const user = new User({
        username: req.body.username.toLowerCase(),
        password: req.body.password
    })
    console.log(user.username)
    req.login(user, function (err){
        if (err){
            console.log(err)
        }else{
            passport.authenticate('local')(req, res, function () {
                res.redirect('index')
            })
        }
    })
})
router.route('/')
    .get(function (req,res) {
    res.render('register')
})
    .post(function (req, res) {
    User.register({username: req.body.username.toLowerCase()}, req.body.password, function(err){
        if (err) {
            console.log(err);
            res.redirect("/");
        } else {
            passport.authenticate('local')(req, res, function(){
                res.redirect("/login");
            });
        }
    });
})
router.get('/dessert', function (req, res) {
    if (req.isAuthenticated()){
        Item.find({category: "Dessert"}, function (err, dessert) {
            if (!err)
                res.render('dessert', {DessertItem: dessert})
        })
    }else{
        res.redirect('/')
    }

})
router.get('/drink', function (req, res) {
    if (req.isAuthenticated()){
        Item.find({category: "Drinks"}, function (err, drink) {
            if (!err)
                res.render('drink', {DrinkItem: drink})
        })
    }else{
        res.redirect('/')
    }
})
router.get('/breakfast', function (req, res) {
    if (req.isAuthenticated()){
        Item.find({category: "Breakfast"}, function (err, breakfast) {
            if (!err)
                res.render('breakfast', {BreakfastItem: breakfast})
        })
    }else{
        res.redirect('/')
    }
})
router.get('/index', function(req, res) {
    if (req.isAuthenticated()){
        Item.find({category: 'Menu'}, function (err, MenuItems) {
            if (!err){
                res.render('index', {MenuItems: MenuItems});
            }
        })
    }else{
        res.redirect('/')
    }
});
// cart
router.route('/cart')
    .get(function (req, res) {
    if (req.isAuthenticated()){
        User.findOne({username: userId}).populate("cart.items.itemId").exec(function (err, user) {
            if (!err){
                let total_price = []
                    user.cart.items.forEach(function (item) {
                       const item_price =  item.itemId.price * item.quantity
                        total_price.push(item_price)
                    })
                const total = total_price.reduce((a, b) => a + b, 0)
                // console.log(user.cart.items.itemId.quantity)
                res.render('cart', {cart: user.cart.items, total_price: total})
                // user.cart.items.map(function (cart) {
                //     console.log(cart.itemId.name)
                //     console.log(cart.itemId.image)
                // })
            }else {
                console.log(err)
            }
        })
    }else{
        res.redirect('/')
    }
})
    .post(function (req,res) {
        if (req.isAuthenticated()){
            User.findOne({username: userId}, function (err, user) {
                if (!err)
                    user.cart.items.push({
                        itemId: req.body.addList,
                        quantity: req.body.quantity
                    })
                        user.save(function (err) {
                            if (!err)
                                res.redirect('/item/'+ req.body.addList)
                        })
                })
        }else{
            res.redirect('/')
        }
    })
// remove item in cart
router.get('/remove/:id', function (req, res) {
    const itemId = req.params.id;
    User.findOne({username: userId})
        .then(user => {
            user
                .removeFromCart(itemId)
                .then(
                    res
                        .status(200)
                        .redirect('/cart')
                );
        })
        .catch(err => console.log(err));

})

router.post('/created-order', function (req, res) {
    if (req.isAuthenticated()) {
        User.findOne({username: userId}).populate("cart.items.itemId")
            .then(user => {
                const items = user.cart.items.map(item => {
                    return {quantity: item.quantity, item: {...item.itemId._doc}};
                });
                const order = new Order({
                    user: {
                        username: user.username
                    },
                    items
                });
                if (!(user.cart.items.length === 0))
                    order.save(function (err) {
                        if (!err)
                            console.log("Successfully save Order")
                });
                return user.clearCart();
            })
            .then(res.status(200).redirect('/orders')).then(res.redirect('/orders'))
            .catch(err => console.log(err));
    }
})

router.get('/orders', function (req, res) {
    if (req.isAuthenticated){
        let total_price = []
        let id = ""
        Order.find({"user.username": userId}, function (err, orders) {
            // console.log(orders)
            orders.map((item) => {
                id = item._id
                item.items.map((order) => {
                    total_price.push(order.quantity * order.item.price)
                })
            })
            const total = total_price.reduce((a, b) => a + b, 0)
            // console.log(orders)
            // console.log(total_price)
            // console.log(id)
            res.render('order', {order: orders, total: total, id: id})
        })
    }else{
        res.redirect("/")
    }

})

router.get('/orders/:id', function (req, res) {
    const orderId = req.params.id;
    Order.findById(orderId).then(order => {
        if (!order) {
            return next(new Error("No order found"));
        }
        const invoiceName = `invoice-${orderId}.pdf`;
        const invoicePath = path.join("data", "invoices", invoiceName);
        /**
         * ! creating a readable stream so node only deals with one chunk at a time.
         * ! Better for bigger files
         */

        const pdfDoc = new PDFDocument();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            'inline; filename="' + invoiceName + '"'
        );
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);
        pdfDoc.fontSize(14).text("Order Invoice", {
            underline: true
        });
        pdfDoc.text("______________________");
        let total = 0;
        order.items.forEach(item => {
            total += item.quantity * item.item.price;
            pdfDoc.text(
                item.item.name + " - " + item.quantity + " x " + "FCFA" + item.item.price
            );
        });
        pdfDoc.text("Total Price: FCFA" + total);
        pdfDoc.end();

        /**
         * ? why the code below
         * ! to show a less optimized way to download pdf files where the whole data has to be preloaded before hand
         */

        // fs.readFile(invoicePath, (err, data) => {
        //   if (err) return next(err);
        //   res.setHeader("Content-Type", "application/pdf");
        //   res.setHeader(
        //     "Content-Disposition",
        //     'inline; filename="' + invoiceName + '"'
        //   );
        //   res.send(data);
        // });
        res.redirect("/index")
    });
})
router.route('/item/:itemId')
    .get(function (req, res) {
    if (req.isAuthenticated()){
        Item.findById(req.params.itemId, function (err, item) {
            if (!err){
                // item.reviews.map(function (review) {
                //     console.log(review)
                //     console.log(review.stars)
                // })
                res.render('./components/partials/item', {item: item})
            }else {
                console.log(err)
            }
        })
    }else{
        res.redirect('/index')
    }
})
    .post(function (req, res) {
        if (req.isAuthenticated()){
            Item.findById(req.params.itemId, function (err, item) {
                item.reviews.push(
                    req.body
                )
                item.save(function (err) {
                    if (!err)
                        console.log("success")
                })
                res.redirect('/index')
            })
        }else {
            res.redirect('/')
        }
    })
router.get('/reservation', function (req, res) {
    res.render('reservation')
})
router.get('/contact', function (req, res) {
    res.render('contact')
})


module.exports = router;
