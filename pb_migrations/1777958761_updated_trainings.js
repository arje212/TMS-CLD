/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7sl3facm8ioc7cn")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ayf41o81",
    "name": "training_code",
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
  collection.schema.removeField("ayf41o81")

  return dao.saveCollection(collection)
})
