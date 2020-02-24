const chokidar = require('chokidar');

const {
  parse
} = require('@babel/parser');

const fs = require('fs');

const path = require('path');

const traverse = require("@babel/traverse").default;

const generator = require('@babel/generator').default; // https://www.babeljs.cn/docs/6.26.3/babel-types


const t = require('babel-types');

const _ = require('lodash');

const generateTryStatementBlockStatement = () => {
  /**
   * object: required
   * property: required
   */
  const identifier = t.identifier('console')
  const identifier1 = t.identifier('log')
  const memberExpression = t.memberExpression(identifier, identifier1)
  const StringLiteral = t.stringLiteral('HELLO AST!!')
  /**
   * callee: required
   * arguments: required
   */
  const callExpression = t.callExpression(memberExpression, [StringLiteral])
  const expressionStatement = t.expressionStatement(callExpression)
  /**
   * body: Array<Statement> (required)
   * directives: Array<Directive> (default: [])
   */
  const blockStatement = t.blockStatement([expressionStatement]) // param-1
  return blockStatement
}

const generateCatchClause = () => {
  // param-2
  const identifier3 = t.identifier('err')
  const identifier1 = t.identifier('console')
  const identifier2 = t.identifier('log')
  const memberExpression = t.memberExpression(identifier1, identifier2)
  /**
   * operator: "+" | "-" | "/" | "%" | "*" | "**" | "&" | "|" | ">>" | ">>>" | "<<" | "^" | "==" | "===" | "!=" | "!==" | "in" | "instanceof" | ">" | "<" | ">=" | "<=" (required)
   * left: Expression (required)
   * right: Expression (required)
   */
  const StringLiteral = t.stringLiteral('err is:')
  const identifier = t.identifier('err')
  const binaryExpression = t.binaryExpression('+',StringLiteral, identifier)
  /**
   * callee: required
   * arguments: required
   */
  const callExpression = t.callExpression(memberExpression, [binaryExpression])
  const expressionStatement = t.expressionStatement(callExpression)

  const blockStatement = t.blockStatement([expressionStatement])
  const catchClause = t.catchClause(identifier3, blockStatement) // param-2
  return catchClause
}

const generateBlockStatement2 = () => {
   // param-3
   const identifier = t.identifier('console')
   const identifier1 = t.identifier('log')
   const memberExpression = t.memberExpression(identifier, identifier1)
  
   const StringLiteral = t.stringLiteral('exec finally')
   /**
    * callee: required
    * arguments: required
    */
   const callExpression = t.callExpression(memberExpression, [StringLiteral])
   const expressionStatement = t.expressionStatement(callExpression)
   const blockStatement = t.blockStatement([expressionStatement])

   return blockStatement
}

/**
 * generateTryStatement:获取最终的被try...catch包裹的函数
 */
const generateTryStatement = () => {
  const tryStatementBlockStatement = generateTryStatementBlockStatement()
  const catchClause = generateCatchClause()
  const blockStatement2 = generateBlockStatement2()
  /**
   * block: BlockStatement (required)
   * handler: CatchClause (default: null)
   * finalizer: BlockStatement (default: null)
   */
  const tryStatement = t.tryStatement(tryStatementBlockStatement, catchClause, blockStatement2)
  return tryStatement
}


class AutoExport {
  constructor(options = {}) {
    if (!_.isObject(options)) {
      console.log("\x1b[31m Warning: \x1b[0m  \x1b[35m Auto-Export-Plugin's options should be a object \x1b[0m ");
      options = {};
    } else if (options.dir && !(_.isArray(options.dir) || _.isString(options.dir))) {
      options.dir = '.';
      console.log("\x1b[31m Warning: \x1b[0m  \x1b[35m Auto-Export-Plugin's dir options should be a array or string  \x1b[0m ");
    } else if (options.ignored && !_.isRegExp(options.ignored)) {
      options.ignored = null;
      console.log("\x1b[31m Warning: \x1b[0m  \x1b[35m Auto-Export-Plugin's ignored options should be a regexp  \x1b[0m ");
    }

    this.options = options;
    this.isWatching = false; // 是否watch模式

    this.watcher = null;
    this.cacheExportNameMap = {};
    this.compileHasError = false;
  }

  getFile(path) {
    const _this = this;
    path.map((item, index) => {
      fs.stat(item, (firsterr, firstData) => {
        // 判断是否是文件夹
        const isDirectory1 = firstData && firstData.isDirectory()
        switch(isDirectory1){
          case true: 
            fs.readdir(item, (err, data) => {
              if (err) throw err;
              // 判断是否是文件夹
              for (let i = 0; i < data.length; i++) {
                fs.stat(item + '/' + data[i], function(err, stats) {
                  const isDirectory = stats.isDirectory()
                  if (isDirectory) {
                    fs.readdir(item + '/' + data[i], (suberr, subdata) => {
                      let datas = subdata.map((items, indexes) => {
                        return items = item + '/' + data[i] + '/' + items
                      })
                      _this.getFile(datas)
                    })
                  } else {
                    const ast1 = _this.getAst(item + '/' + data[i]); // 1:path
                    _this.handleAst(ast1, item + '/' + data[i])
                  }
                });
              }
            });
            break;
          case false:
            const ast2 = _this.getAst(item); // 1:path
            _this.handleAst(ast2, item)
            break;
          default:
            console.log('\x1b[34m 这不是正确路径，请输入正确路径！ \x1b[0m');
        }
       
      })
     
    })
  }

  init(compilation) {
    // 递归获取js文件
    this.getFile(this.options.dir)
  }

  getAst(filename) {
    const content = fs.readFileSync(filename, 'utf8');

    try {
      const ast = parse(content, {
        sourceType: 'module'
      }); // get ast tree

      return ast;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  handleAst(ast, filePath) {
      traverse(ast, {
        Program: {
          exit(path) {
              // 设置输出格式
              const output = generator(ast, { 
                  quotes: 'single', 
                  retainLines: false, 
                  compact: false,
                  concise: false
              });
              fs.writeFileSync(filePath, output.code);
          }
      },
      ExpressionStatement(path) {
        // 加此判断保证不会在处理完成之后的栈溢出
        if (path.parentPath.parent.type == 'FunctionDeclaration') {
            const nodeBody = t.blockStatement([path.node])
            const catchClause = generateCatchClause()
            const tryStatement = t.tryStatement(nodeBody, catchClause)
            path.replaceWith(tryStatement) // 当前节点才能实现替换
        }
      }
    })
  }

  watchClose() {
    if (this.watcher) {
      this.watcher.close();
    }
  } 

  // 实例化时调用 apply
  apply(compiler) {
    const init = this.init.bind(this);
    const watchClose = this.watchClose.bind(this);

    if (compiler.hooks) {
      compiler.hooks.watchRun.tap('AutoExport', () => {
        this.isWatching = true;
      });
      compiler.hooks.done.tap('AutoExport', init);
      compiler.hooks.watchClose.tap('AutoExport', watchClose);
    } else {
      compiler.plugin('watchRun', () => {
        this.isWatching = true;
      });
      compiler.plugin('done', init);
      compiler.plugin('watchClose', watchClose);
    }
  }

}

module.exports = AutoExport;