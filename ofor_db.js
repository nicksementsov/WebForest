const { Pool } = require("pg");
const ofor_db = new Pool();

module.exports = 
{
	// new
	find_class,
	modify_character_equipment,
	add_equipment,
	list_equipment,
	find_equipment_item,
	find_character_equipment,
	find_character_by_id,
	list_classes,
	list_characters,
	add_character,
	find_user_by_email,
	find_user_by_id,
	check_email_in_use,
	add_user
};

// NEW

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

function find_class(class_id, callBack) {
	ofor_db.query("SELECT * FROM classes WHERE class_id = $1", [class_id], (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}


function modify_character_equipment(player_id, equipment_id, equipment_slot, callBack) {
	const query = `UPDATE character_equipment SET ${equipment_slot} = ${equipment_id} WHERE character_id = ${player_id}`;
	ofor_db.query(query, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res);
		}
	});
}


function add_equipment(equipment_cat, eqData, callBack) {
	const query = `INSERT INTO ${equipment_cat}_equipment (equipment_name, equipment_level, equipment_str, equipment_int, equipment_dex, equipment_cha) VALUES ($1, $2, $3, $4, $5, $6)`;
	values = [eqData.eqName, eqData.eqLevel, eqData.eqStr, eqData.eqDex, eqData.eqInt, eqData.eqCha];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows);
		}
	});
}

function list_equipment(equipment_cat, callBack) {
	const query = `SELECT * FROM ${equipment_cat}_equipment`
	ofor_db.query(query, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows);
		}
	});
}

function find_equipment_item(itemID, category, callBack) {
	const query = `SELECT * FROM ${equipment_slots[category]}_equipment WHERE equipment_id = $1`;
	const values = [itemID];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function find_character_equipment(charID, callBack) {
	const query = "SELECT * FROM character_equipment WHERE character_id = $1";
	values = [charID];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function find_character_by_id(charID, callBack) {
	const query = "SELECT * FROM characters WHERE character_id = $1";
	const values = [charID];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function list_classes(callBack) {
	const query = "SELECT * FROM classes";
	ofor_db.query(query, (err, res) => {
		if (err) {
			callBack(err, null);
		} else {
			callBack(null, res.rows);
		}
	});
}

function list_characters(user_id, callBack) {
	const query = "SELECT * FROM characters INNER JOIN classes ON characters.class_id = classes.class_id WHERE characters.user_id = $1";
	const values = [user_id];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
 		} else {
 			success: callBack(null, res.rows);
 		}
	});
}

function add_character(userID, newCharacter, callBack) {
	query = "INSERT INTO characters (user_id, class_id, character_name) VALUES ($1, $2, $3) RETURNING character_id";
	values = [userID, newCharacter.classID, newCharacter.characterName];
	ofor_db.query(query, values, (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			equipQuery = "INSERT INTO character_equipment (character_id) VALUES ($1)";
			equipValues = [res.rows[0].character_id];
			ofor_db.query(equipQuery, equipValues, (eqErr, eqResult) => {
				if (eqErr) {
					failure: callBack(eqErr, null);
				} else {
					success: callBack(null, eqResult);
				}
			});
		}
	});
}

function find_user_by_email(user_email, callBack) {
	ofor_db.query("SELECT user_id FROM users WHERE user_email = $1", [user_email], (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function find_user_by_id(userID, callBack) {
	ofor_db.query("SELECT * FROM users WHERE user_id = $1", [userID], (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function check_email_in_use(userEmail, callBack) {
	ofor_db.query("SELECT exists (SELECT 1 FROM users WHERE user_email = $1)", [userEmail], (err, res) => {
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}

function add_user(userEmail, userName, userPass, callBack) {
	query = "INSERT INTO users (user_name, user_email, hashed_salted) VALUES ($1, $2, $3) RETURNING user_id";
	values = [userName, userEmail, userPass];
	ofor_db.query(query, values, (err, res) =>{
		if (err) {
			failure: callBack(err, null);
		} else {
			success: callBack(null, res.rows[0]);
		}
	});
}