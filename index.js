const path = require("path");
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser")
const bcrypt = require("bcrypt");
// const session = require("express-session");
const db_manager = require("./ofor_db");

const cron = require('node-cron');

const app = express();
const PORT = 8080;
const saltRounds = 10;

app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));
app.use(cookieParser(process.env.SERVSECRET));
// app.use(session({
// 	secret: process.env.SERVSECRET
// }));

app.use('/static', express.static(path.join(__dirname, "/static")));
app.use('/js', express.static(path.join(__dirname, '/js')));

app.use('/css', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/js')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/@popperjs/core/dist/umd')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

var equipment_slots = 
[
	"head", 
	"body", 
	"leg", 
	"hand", 
	"feet",
	"arms",
	"arms"
];

// ******TEST******

cron.schedule('* * * * * *', function() {
	db_manager.find_all_characters_on_quest((err, res) => {
		for (let row of res) {
			db_manager.find_quest_by_id(row.quest_id, (questErr, questRes) => {
				let current_dt = new Date();
				let quest_start_dt = new Date(row.quest_start_dt);
				let questTime = current_dt - quest_start_dt;

				// quest_duration is stored in seconds, questTime is in milliseconds
				if ((questTime / 1000) >= questRes.quest_duration) {
					db_manager.disembark_character(row.character_id, (embErr, embRes) => {
						console.log(embRes);
						console.log(`Chron! - ${Date()}`);
					});
				}

				// console.log(`**** CHARACTER_ID: ${row.character_id} ****`)
				// console.log(`Quest_${row.quest_id}: ${questRes.quest_title}`);
				// console.log(`Quest start time: ${row.quest_start_dt}`)
				// console.log(`Quest duration (minutes): ${questRes.quest_duration / 60}`);
				// console.log(`Time on quest (minutes) : ${questTime / (1000 * 60)}`);
				// TODO:
				// If questTime >= quest_duration:
				// 		Take character of quest
				//			Set on_quest=false, clear quest_id and quest_start_dt
			});
		}
	});
});

// ******TEST******

// Function to see if user is logged in
function user_logged_in(req) {
	if (req.signedCookies.userID && req.signedCookies.userID != -1) {
		return true;
	} else {
		return false;
	}
}

// Check if user is logged in middleware
const check_user_logged = (req, res, next) => {
	if (!req.signedCookies.userID || req.signedCookies.userID == -1) {
		return res.redirect('/login');
	} else {
		next();
	}
}

// Returns all character detail for given charID as a single JSON object
app.get('/requestCharacter/:charID', (req, res) => {
	const { charID}  = req.params;
	buildCharacter(charID, (err, result) => {
		res.send(result);
	});
});

// Alter character/change equipment post
app.post('/altercharacter', (req, res) => {
	const ourCharID = parseInt(req.body.chID);
	const ourItemID = parseInt(req.body.eqID);
	const ourSlot = req.body.eqSlot;
	db_manager.find_character_by_id(req.body.chID, (charErr, charResult) => {
		if (req.signedCookies.userID != charResult.user_id) {
			res.redirect(301, `/characters/${ourCharID}`)
		} else {
			db_manager.modify_character_equipment(ourCharID, ourItemID, ourSlot, (err, result) => {
				if (err) {
					console.log(err);
				} else {
					res.redirect(301, `/characters/${ourCharID}`);
				}
			});
		}
	});
});

// List user characters page
app.get('/characters', check_user_logged, (req, res) => {
	db_manager.list_characters(req.signedCookies.userID, (charErr, charResult) => {
		res.render('characterlist', {title: 'Your Characters', 
			loggedIn: true, 
			characters: charResult});
	});
});

// Add item post
app.post('/additem', (req, res) => {
	db_manager.add_equipment(req.body.category, req.body, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			res.redirect(301, `/list/${req.body.category}`);
		}
	});
});

// Item list page
app.get('/list/:category', (req, res) => {
	var { category } = req.params;
	var picking = false;
	var ourPlayer = 0;
	var ourSlot = null;
	if (req.query.p === 'true') {
		picking = true;
		ourPlayer = parseInt(req.query.pid);
		ourSlot = req.query.slot;
	}
	db_manager.list_equipment(category, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			const pageTitle = `${category} Equipment List`
			res.render('tablelist', {
				title: pageTitle,
				loggedIn: user_logged_in(req),
				category: category, 
				slot: ourSlot,
				equipment: result, 
				picking: picking, 
				ourPlayer: ourPlayer});
		}
	});
});

// View quest page
app.get('/viewquest/:questID/:charID',  check_user_logged, (req, res) => {
	const questID = req.params.questID;
	const charID = req.params.charID;
	buildCharacter(charID, (charErr, charRes) => {
		if (charErr == -1) {
			res.redirect(302, '/questlog');
		} else {
			if (charRes.charResult.user_id != req.signedCookies.userID) {
				res.redirect(303, '/questlog');
			} else {
				if (charRes.charResult.quest_id != questID) {
					res.redirect(302, '/questlog');
				} else {
					db_manager.find_quest_by_id(questID, (questErr, questRes) => {
						let current_dt = new Date();
						let quest_start_dt = new Date(charRes.charResult.quest_start_dt);
						let time_on_quest = (current_dt - quest_start_dt) / 1000;
						res.render('viewquest', {title: 'Viewing Quest', loggedIn: true, 
							ourCharacter: charRes.charResult,
							ourClass: charRes.classResult,
							ourQuest: questRes, 
							questTime: time_on_quest});
					});
				}
			}
		}
	});
});

// Function to compile all character info into single object
function buildCharacter(charID, callBack) {
	// Recursive function to find details for all equipment worn by a character 
	function find_equipment_items(onSlot, eqItems, callBack) {
		if (onSlot < equipment_slots.length) {
			db_manager.find_equipment_item(eqItems[onSlot], onSlot, (err, result) => {
				if (err) {
					callBack(err, null);
				} else {
					equipment.push(result);
					find_equipment_items(onSlot + 1, eqItems, callBack);
				}
			});
		} else {
			callBack(null, 'test');
		}
	}
	var equipment = [];
	db_manager.find_character_by_id(charID, (err, charResult) => {
		if (!charResult) {
			return callBack('-1', null);
		}
		// Base class info stored in dedicated table
		db_manager.find_class(charResult.class_id, (classErr, classResult) => {
			db_manager.find_character_equipment(charID, (eqErr, eqResult) => {
				find_equipment_items(0, [
					eqResult.head,
					eqResult.body,
					eqResult.leg,
					eqResult.hand, 
					eqResult.feet,
					eqResult.left_hand,
					eqResult.right_hand
					], (eqFindErr, eqFindRes) => {
					var stats = {
						str: classResult.class_str,
						int: classResult.class_int,
						dex: classResult.class_dex,
						cha: classResult.class_cha
					}
					for (let equipmentItem of equipment) {
						stats.str += parseInt(equipmentItem.equipment_str),
						stats.int += equipmentItem.equipment_int,
						stats.dex += equipmentItem.equipment_dex,
						stats.cha += equipmentItem.equipment_cha
					}
					callBack(null, {charResult, classResult, stats, equipment});
				});
			});
		});
	});
}

// User questlog page
app.get('/questlog', check_user_logged, (req, res) => {
	function find_quests(onCharacter, characters, listLength, callBack) {
		if (onCharacter < listLength) {
			db_manager.find_quest_by_id(characters[onCharacter].quest_id, (questErr, questRes) => {
				if (questErr) {
					callBack(err, null);
				} else {
					quests.push(questRes);
					find_quests(onCharacter + 1, characters, listLength, callBack);
				}
			});
		} else {
			callBack(null, 'finished');
		}
	}
	var quests = [];
	db_manager.find_characters_on_quest(req.signedCookies.userID, (charErr, charResult) => {
		find_quests(0, charResult, charResult.length, (questErr, questRes) => {
			res.render('questlog',
				{title: 'Quest Log',
				loggedIn: true,
				characters: charResult,
				quests: quests,
				numQuests: quests.length
			});
		});
	}); 
});

// Quest embarkation post
app.post('/embark', check_user_logged, (req, res) => {
	db_manager.find_character_by_id(req.body.characterSelection, (charErr, charResult) => {
		if ((charResult.user_id != req.signedCookies.userID) || (charResult.on_quest === true)) {
			res.redirect(302, '/embark');
		} else {
			// Use UTC time for everything, only convert to local when presenting the view
			let questTime = new Date().toISOString();
			db_manager.embark_character(charResult.character_id, req.body.questSelection, questTime, (embErr, embResult) => {
				res.redirect(302, '/questlog');
			});
		}
	});
});

// Quest embarkation page
app.get('/embark', check_user_logged, (req, res) => {
	db_manager.list_characters(req.signedCookies.userID, (charErr, charResult) => {
		db_manager.list_quests(100, (questErr, questResult) => {
			res.render('embark', {title: 'New Quest',
				loggedIn: true,
				ourUserID: req.signedCookies.userID,
				characters: charResult,
				quests: questResult
			});
		});
	});
});

// Character view page
app.get('/characters/:charID', (req, res) => {
	const { charID } = req.params;
	buildCharacter(charID, (err, result) => {
		res.render('viewcharacter',
			{title: result.charResult.character_name,
				loggedIn: user_logged_in(req),
				character: result.charResult,
				charClass: result.classResult,
				stats: result.stats,
				equipment: result.equipment
			});
	});
});

// Character creation post
app.post('/newcharacter', check_user_logged, (req, res) => {
	db_manager.add_character(
		parseInt(req.body.userID),
		{
			classID: parseInt(req.body.classSelection),
			characterName: req.body.characterName
		},
		(err, result) => {
			res.redirect(302, '/characters');
		});
});

// Character creation page
app.get('/newcharacter', check_user_logged, (req, res) => {
	db_manager.find_user_by_id(req.signedCookies.userID, (err, result) => {
		if (err) {
			res.redirect(302, '/');
		} else {
			db_manager.list_classes((classErr, classResult) => {
				res.render('newcharacter',{title: 'Create New Character', 
					loggedIn: true,
					classes: classResult,
					ourUser: req.signedCookies.userID});
			});
		}
	});
});

// User logout post
app.post('/logout', check_user_logged, (req, res) => {
	res.cookie('userID', -1, {signed: true});
	res.redirect(302, '/');
});

// User login post
app.post('/login', (req, res) => {
	db_manager.find_user_by_email(req.body.loginEmail, (err, result) => {
		if (err) {
			console.log(err)
		} else {
			if (result) {
				bcrypt.compare(req.body.loginPassword, result.hashed_salted, (bcErr, bcRes) => {
					if (bcRes) {
						res.cookie('userID', result.user_id, {signed: true}, { maxAge: 9000000 });
						res.redirect(302, '/characters');
					} else {
						res.redirect(302, '/login');
					}
				});
			} else {
				res.redirect(302, '/login');
			}
		}
	});
});

// User registration post
app.post('/register', (req, res) => {
	if (req.body.regPasswordOne !== req.body.regPasswordTwo) {
		res.redirect(302, '/login');
	} else {
		db_manager.check_email_in_use(req.body.regEmail, (checkErr, checkRes) => {
			if (!checkRes.exists) {
				bcrypt.genSalt(saltRounds, (saltErr, salt) => {
					bcrypt.hash(req.body.regPasswordOne, salt, (hashErr, hash) => {
						db_manager.add_user(req.body.regEmail, req.body.regName, hash, (addUserErr, addUserRes) => {
							res.cookie('userID', addUserRes.user_id, {signed: true}, { maxAge: 9000000 });
							res.redirect(302, '/characters');
						});
					});
				});
			} else {
				res.redirect(302, '/login');
			}
		});
	}
});

// Login page
app.get('/login', (req, res) => {
	if (user_logged_in(req)) {
		res.redirect(307, '/');
	} else {
		res.render('login', {title: "Login", loggedIn: false});
	}
});

// Home Page
app.get('/', (req, res) => {
	if (user_logged_in(req)) {
		db_manager.find_user_by_id(req.signedCookies.userID, (err, result) => {
			res.render('index', {title: "Home", loggedIn: true, user: result});
		});
	} else {
		res.render('index', {title: "Home", loggedIn: false});
	}
});

// 404 Route
app.use((req, res) => {
	res.status(404).render('404_error', {title: '404 Page Not Found', loggedIn: user_logged_in(req)});
});

app.listen(PORT, () => {
	const strin = `listening on port: ${PORT}`;
	console.log(strin);
});