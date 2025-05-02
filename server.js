const express = require('express');
const fs = require('fs');
const bodyParser = require("body-parser"); /* To handle post parameters */
const path = require("path");
require("dotenv").config({
   path: path.resolve(__dirname, ".env"),
});
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
app.use(bodyParser.urlencoded({extended:false}));
app.set('view engine', 'ejs');
app.set('views', __dirname);
app.use(express.static('public'));

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Web server started and running at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/cocktail-search', (req, res) => {
    res.render('cocktailform');
});

app.get('/view-cocktails', async (req, res) => {
    const URL = "https://www.thecocktaildb.com/api/json/v1/1/filter.php?c=Cocktail";
    const response = await fetch(URL);
    const data = await response.json();
    console.log(data['drinks']);
    const header = `<div class="grid-container">`;
    const drinks = data['drinks'].reduce((acc, drink) => {
        return acc + `<a href="cocktail/${drink.idDrink}"> <div class="card"> <img src="${drink.strDrinkThumb}" /> 
                <p> ${drink.strDrink}</p> </div> </a>`
    }, "")
    const footer = "</div>"
    const drinkHtml = header + drinks + footer;
    res.render('viewcocktails', {drinkHtml: drinkHtml});

})

app.get('/cocktail/:id', async (req, res) => {
    const URL = `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${req.params.id}`;
    const response = await fetch(URL);
    const data = await response.json();
    const cocktail = data['drinks'][0];
    const ingredients = {};
    for(let i = 1; i <= 15; i++) {
        if(cocktail[`strIngredient${i}`]) {
            ingredients[cocktail[`strIngredient${i}`]] = cocktail[`strMeasure${i}`]
        }
    }
    console.log(cocktail);
    console.log(ingredients);
    res.render('cocktailinfo', {cocktail: data['drinks'][0], ingredients: ingredients});
})