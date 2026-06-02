/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7sl3facm8ioc7cn")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "iqsoeh7r",
    "name": "trainings",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7sl3facm8ioc7cn")

  // remove
  collection.schema.removeField("iqsoeh7r")

  return dao.saveCollection(collection)
})
