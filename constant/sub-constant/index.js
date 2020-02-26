function AA() {
  try {
    console.log('this is arrow function');
    console.log('this is arrow function second line');
  } catch (err) {
    console.log("err is:" + err);
  } finally {
    console.log("exec finally");
  }
}