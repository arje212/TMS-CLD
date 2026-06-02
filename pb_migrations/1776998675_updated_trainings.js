/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7sl3facm8ioc7cn")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cdyzvvki",
    "name": "end_time",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "2o237izk",
    "name": "trainer",
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
  collection.schema.removeField("cdyzvvki")

  // remove
  collection.schema.removeField("2o237izk")

  return dao.saveCollection(collection)
})
