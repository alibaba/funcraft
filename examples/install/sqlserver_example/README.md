### mac 下安装 Sql Server 2017

```bash
docker pull mcr.microsoft.com/mssql/server:2017-latest

docker run -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=Codelife.me' \
   -p 1433:1433 --name sql1 \
   -d mcr.microsoft.com/mssql/server:2017-latest

brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew update
ACCEPT_EULA=y brew install --no-sandbox msodbcsql mssql-tools

sqlcmd -S localhost -U SA -P 'Codelife.me'
```

```sql
CREATE DATABASE TestDB
SELECT Name from sys.Databases
GO

USE TestDB
CREATE TABLE Inventory (id INT, name NVARCHAR(50), quantity INT)
INSERT INTO Inventory VALUES (1, 'banana', 150); INSERT INTO Inventory VALUES (2, 'orange', 154);
GO

SELECT * FROM Inventory WHERE quantity > 152;
GO

QUIT
```


### 参考阅读

1. https://docs.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker?view=sql-server-2017
2. https://cloudblogs.microsoft.com/sqlserver/2017/05/16/sql-server-command-line-tools-for-macos-released/