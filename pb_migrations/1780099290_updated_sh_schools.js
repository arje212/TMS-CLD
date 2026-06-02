/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("s5ln23hanis6ae3")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yv1rnc9n",
    "name": "status",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "active",
        "inactive"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("s5ln23hanis6ae3")

  // remove
  collection.schema.removeField("yv1rnc9n")

  return dao.saveCollection(collection)
})
