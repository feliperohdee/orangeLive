/*
 * Examples {Quick Reference: http://docs.aws.amazon.com/amazondynamodb/latest/APIReference}  
 *
 *-------- Using ALIAS --------
 * alias({names: {email: 'email'},values: {email: email}
 *
 *-------- Using Filter Expression --------
 * filterExpression: 'attribute_exists(#n) AND NOT contains(#n, :n)',
 * filterExpression: NOT #n IN (:n1, :n2, :n3)',
 * - attribute_exists(path)
 * - attribute_not_exists(path)
 * - contains(path, operand) => case-sensitive
 * - begins_with(path, operand) => case-sensitive
 * - = <> < <= > >= ()
 * - IN, BETWEEN, NOT, AND, OR
 *
 * -------- Using Condition Expression -------- {it compares value that is trying insert, identified by alias name against alias value}
 * conditionExpression: 'NOT #accountId = :accountId'
 * - attribute_exists(path)
 * - attribute_not_exists(path)
 * - contains(path, operand) => case-sensitive
 * - begins_with(path, operand) => case-sensitive
 * - = <> < <= > >= ()
 * - IN, BETWEEN, NOT, AND, OR
 *
 *-------- Using Update Expression --------
 * UpdateExpression: "set LastPostedBy = :val1",
 * UpdateExpression: "set Replies = Replies - :num",
 * UpdateExpression: "add Replies = :num" {same of above},
 * UpdateExpression: "set a=:value1, b=:value2 delete :value3, :value4, :value5",
 *  
 * - SET - Adds one or more attributes and values to an item. If any of these attribute already exist, they are replaced by the new values. You can also use SET to add or subtract from an attribute that is of type Number. 
 *       - if_not_exists (path, operand) If the item does not contain an attribute at the specified path, then if_not_exists evaluates to operand; otherwise, it evaluates to path. You can use this function to avoid overwriting an attribute already present in the item.
 *       - list_append (operand, operand) You can append the new element to the start or the end of the list by reversing the order of the operands.
           > begin => SET #pr.FiveStar = list_append(:r, #pr.FiveStar)
           > end => SET #pr.FiveStar = list_append(#pr.FiveStar, :r)
 * - REMOVE - Removes one or more attributes from an item.
 * - ADD - Adds the specified value to the item. If the existing attribute is a number, and if Value is also a number, then Value is mathematically added to the existing attribute. If the existing data type is a set and if Value is also a set, then Value is added to the existing set.
 * - DELETE - Deletes an element from a set.
 * 
 *-------- Using Batch Operations --------
 * putItems('table').set([{
 *     hash: 'n',
 *     otherKey: '...'
 * }, {
 *     hash: 'n',
 *     range: '...'
 * }])
 * 
 * deleteItems('table').where([{
 *     hash: 'n',
 *     otherKey: '...'
 * }, {
 *     hash: 'n',
 *     range: '...'
 * }])
 *
 */

/*
 * -------- Using Create Table --------
 */
dynamodb.table.create('tbl')
        .withHash('attr as STRING')
        .withRange('attr as NUMBER')
        .withLocalIndex({
            attribute: 'attr as STRING',
            projection: 'KEYS_ONLY'
        })
        .withLocalIndex({
            attribute: 'attr' // => as STRING projection ALL
        })
        .withLocalIndex({
            attribute: 'attr as STRING',
            projection: 'KEYS_ONLY'
        })
        .withGlobalIndex({
            attributes: ['attr as NUMBER', 'attr as STRING']
        }).throughput(10,10).exec();

/*
 * -------- Using Put Item --------
 */
set.insert.item('tblTest')
        .set({
            id: 1,
            date: 'date',
            name: 'name',
            email: 'email',
            array: ['itemOne', 'itemTwo'],
            obj: {
                string: 'someString',
                number: 1,
                bool: true,
                array: ['itemOne', 'itemTwo'],
                obj: {
                    key: {
                        keyIn: 'value'
                    }
                }
            }
        })
        .exec()
        .then(function (r) {
            console.log(r);
        })
        .catch(function (err) {
            console.log(err);
        });

/*
 * -------- Using Query Items --------
 */
dynamodb.get.queryItems('tbl')
        .where({
            id: ['=', 'id'],
            name: ['^', 'someKey']
        })
        .asc()
        .withFilter('contains(#array, :arrayValues) AND attribute_exists(#obj.objIn)')
        .exec()
        .then(function (r) {
            console.log(r);
        })
        .catch(function (err) {
            console.log(err);
        });

/*
 * -------- Using Get Item --------
 */
dynamodb.get.item('tbl')
        .where({
            id: 'id',
            name: 'someKey'
        })
        .exec()
        .then(function (r) {
            console.log(r);
        })
        .catch(function (err) {
            console.log(err);
        });