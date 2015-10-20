# Orange Live

Hey, this project is just for study purposes.

That's a small project which uses Node.js and AWS Dynamo Db (an amazing noSql database from AWS) to create a realtime database, with double bindings, and support for deep operations. It's really simple, and I improving it to make it simpler, because now I have time to do it.

## Let's fire

* Download and install local dynamodb distro (http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tools.DynamoDBLocal.html)
* Download and install redis server (http://redis.io/download)
* Clone this repo
* At terminal, type 'npm install' in this project folder
* Create a symbolic link like > 'ln -s [path-to-dynamodb-folder] dynamodb'
* In your dynamodb folder, create another folder called liveorange
* Now, at terminal just type 'grunt dev', this task is going to take care to start, and kill dynamodb, redis and node.js for you
* In your browser, go to, 'http://localhost:3000'
* To turn it off, just type Ctrl+C in your terminal

# Live demo at (http://liveorange.herokuapp.com)
# Enjoy !!!!
