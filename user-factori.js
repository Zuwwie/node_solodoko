function createNewUser(name, age) {
    return {
        name,
        age,
        hello: () => {
            console.log('Hello my name is ' + name);
        }
    };
}

module.exports = {createNewUser};