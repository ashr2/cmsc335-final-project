const express = require('express');
const fs = require('fs');
const bodyParser = require("body-parser"); /* To handle post parameters */
const path = require("path");
require("dotenv").config({
   path: path.resolve(__dirname, ".env"),
   path: path.resolve(__dirname, "credentialsDontPost/.env"),
});
const { MongoClient, ServerApiVersion } = require("mongodb");
const databaseName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_COLLECTION;
const uri = "mongodb+srv://" + process.env.MONGO_DB_USERNAME + 
	":" + process.env.MONGO_DB_PASSWORD + 
		"@cocktailapp.swxcb3m.mongodb.net/?retryWrites=true&w=majority&appName=CocktailApp";
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

const app = express();
app.use(bodyParser.urlencoded({extended:false}));
app.set('view engine', 'ejs');
app.set('views', __dirname);
app.set("views", path.resolve(__dirname, "templates"));
app.use(express.static('public'));

const cache = {};
const PORT = 3000;

async function main() {
	try {
		await client.connect();
	} catch (e) {
		console.error(e);
	}
}

async function addIngredients(ingredients) {
	const database = client.db(databaseName);
    const collection = database.collection(collectionName);
    await collection.insertMany(ingredients);
    console.log(ingredients);
}

async function removeAll() {
	const database = client.db(databaseName);
    const collection = database.collection(collectionName);
	await collection.deleteMany({});
}

async function getIngredients() {
	const database = client.db(databaseName);
    const collection = database.collection(collectionName);
	const result = collection.find({});
	arr = await result.toArray();
	return arr;
}

app.listen(PORT, () => {
    console.log(`Web server started and running at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
    res.render('index');
    main();
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

app.get("/save-ingredients", async (req, res) => {
    jsonFilename = "ingredients.json";
    const data = JSON.parse(fs.readFileSync(jsonFilename));
    console.log(data);
    const ingredientsHTML = data["drinks"].reduce((acc, curr) => {
        const ingredient = curr["strIngredient1"];
        return acc + `<option value="${ingredient}"> 
        ${ingredient}
        </option>`;
    }, "");
    res.render('saveingredientsform', {ingredientsHTML} );
});

app.get("/processed-save-ingredients", async (req, res) => {
	let ingredients = [];
    let counter = 1;
    while(req.query[`ingredient${counter}`] !==  req.query['bullshit']) {
        ingredients.push(req.query[`ingredient${counter}`]);
        counter += 1;
    }
    console.log("Ingredient check: " + ingredients);
    let ingredientsJSON = [];
    ingredients.forEach((curr, i) => {
        if (curr !== "None") {
            const element = {name: curr};
            ingredientsJSON.push(element);
        }
    });
    console.log("Ingredient check: " + ingredientsJSON);
	await addIngredients(ingredientsJSON);
    res.render('processedsaveingredients');
});

app.get("/remove-saved", async (req, res) => {
    res.render('removesaved');
});

app.post("/remove-saved", async (req, res) => {
	let remove = async () => {
		await removeAll();
		res.render('processedremovesaved');
	}
	remove();
});

app.get("/search-saved", async (req, res) => {
    let ingredients = await getIngredients();
    const drinkMap = {};
    const idSets = [];
    for(let i = 0; i < ingredients.length; i++) {
        const URL = `https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=${ingredients[i].name}`;
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

process.stdout.write("Stop to shutdown the server: ");
process.stdin.setEncoding("utf8");
process.stdin.on('readable', () => {
	const dataInput = process.stdin.read();
	if (dataInput !== null) {
		const command = dataInput.trim();
		if (command === "stop") {
			process.stdout.write("Shutting down the server"); 
			client.close();
            process.exit(0);
        } else {
			process.stdout.write(`Invalid command: ${command}\n`);
		}
        process.stdout.write("Stop to shutdown the server: ");
		process.stdin.resume();
    }
});