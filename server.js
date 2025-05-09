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

const cache = {};
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Web server started and running at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
    res.render('index');
});


app.get('/view-cocktails', async (req, res) => {
    const URL = "https://www.thecocktaildb.com/api/json/v1/1/filter.php?c=Cocktail";
    const response = await fetch(URL);
    const data = await response.json();
    console.log(data['drinks']);
    const header = `<div class="grid-container">`;
    const drinks = data['drinks'].reduce((acc, drink) => {
        return acc + `<a href="cocktail/${drink.idDrink}"> <div class="card"> <img src="${drink.strDrinkThumb+"/small"}" /> 
                <p> ${drink.strDrink}</p> </div> </a>`;
    }, "");
    const footer = "</div>";
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
            ingredients[cocktail[`strIngredient${i}`]] = cocktail[`strMeasure${i}`];
        }
    }
    console.log(cocktail);
    console.log(ingredients);
    res.render('cocktailinfo', {cocktail: data['drinks'][0], ingredients: ingredients});
})

app.get('/cocktail-search', async (req, res) => {
    jsonFilename = "ingredients.json";
    const data = JSON.parse(fs.readFileSync(jsonFilename));
    console.log(data);
    const ingredientsHTML = data["drinks"].reduce((acc, curr) => {
        const ingredient = curr["strIngredient1"];
        return acc + `<option value="${ingredient}"> 
        ${ingredient}
        </option>`;
    }, "");
    res.render('cocktailform', {ingredientsHTML} );
});

// There is a multi-ingredient search option but you need to pay $10
app.get('/process-cocktail-search', async (req, res) => {
    let ingredients = [];
    let counter = 1;
    while(req.query[`ingredient${counter}`] !==  req.query['bullshit']) {
        ingredients.push(req.query[`ingredient${counter}`]);
        counter += 1;
    }

    const drinkMap = {};
    const idSets = [];
    for(let i = 0; i < ingredients.length; i++) {
        if(ingredients[i] !== "None") {
            const URL = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=${ingredients[i]}`;
            const response = await fetch(URL);
            const data = await response.json();
            const drinks = data["drinks"] || [];
            const idSet = new Set();
            for(let j = 0; j < drinks.length; j++) {
                idSet.add(drinks[j]["idDrink"]);
                drinkMap[drinks[j]["idDrink"]] = drinks[j];
            }
            idSets.push(idSet);
        }
    }
    if(idSets.length > 0) {
        const commonIds = idSets.reduce((acc, currSet) =>
            new Set([...acc].filter(id => currSet.has(id)))
        );
        const filteredDrinks = [...commonIds].map(id => drinkMap[id]);
        console.log(filteredDrinks);
        const header = `<div class="grid-container">`;
        const drinks = filteredDrinks.reduce((acc, drink) => {
            return acc + `<a href="cocktail/${drink["idDrink"]}"> <div class="card"> <img src="${drink.strDrinkThumb+"/small"}" /> 
                    <p> ${drink.strDrink}</p> </div> </a>`;
        }, "");
        const footer = "</div>";
        const drinkHtml = header + drinks + footer;
        res.render('viewcocktails',{drinkHtml: drinkHtml})
    } else {
        res.redirect('/view-cocktails');
    }
});