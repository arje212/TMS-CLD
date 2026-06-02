/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "4s7ide43t7i7b3h",
    "created": "2026-05-30 00:37:31.590Z",
    "updated": "2026-05-30 00:37:31.590Z",
    "name": "yt_training_assignments",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "4pomqw4p",
        "name": "trainee",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "w1wlny8vewcsdb2",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "pkr0roys",
        "name": "training",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "vyljvc7lj91ur19",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "n0w45x8z",
        "name": "assigned_date",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("4s7ide43t7i7b3h");

  return dao.deleteCollection(collection);
})
