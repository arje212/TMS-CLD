/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7sl3facm8ioc7cn")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "eecrtb8x",
    "name": "status",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "upcoming",
        "ongoing",
        "completed"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7sl3facm8ioc7cn")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "eecrtb8x",
    "name": "status",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "upcoming",
        "ongoing",
        "complete"
      ]
    }
  }))

  return dao.saveCollection(collection)
})
