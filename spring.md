# Building Restful Webservices using Spring Boot

Banuprakash C

Full Stack Architect, Co-founder Lucida Technologies Pvt Ltd., Corporate Trainer,

Email: banuprakashc@yahoo.co.in

https://www.linkedin.com/in/banu-prakash-50416019/

https://github.com/BanuPrakash/RESTful

===================================

Softwares Required:
1) Java 8+
	https://www.oracle.com/in/java/technologies/javase/javase-jdk8-downloads.html

2) Eclipse for JEE  
	https://www.eclipse.org/downloads/packages/release/2020-03/m1/eclipse-ide-enterprise-java-developers

3) MySQL  [ Prefer on Docker]

Install Docker Desktop

Docker steps:

```
a) docker pull mysql

b) docker run --name local-mysql –p 3306:3306 -e MYSQL_ROOT_PASSWORD=Welcome123 -d mysql

container name given here is "local-mysql"

For Mac:
docker run -p 3306:3306 -d --name local-mysql -e MYSQL_ROOT_PASSWORD=Welcome123 mysql


c) CONNECT TO A MYSQL RUNNING CONTAINER:

$ docker exec -t -i <container_name> /bin/bash

d) Run MySQL client:

bash terminal> mysql -u "root" -p

mysql> exit

```
=================================

RESTful Web Services

REST ==> REprsentational State Transfer; archtectural style for distributed hypermedia systems
Roy Fielding -- 2000

Resource?
document, image, services, collection of other services ,printer

REST APIs use Uniform Resource Identifier to address resources.

* Singleton and Collection Resources
	* "customers" is a collection resources; "customer" is a singleton resource

* Collections and sub-collections resources
	"/customers/{customerId}/accounts"

* The state of the resource at any particular time ==> Resource Representation

* Content Negotiation
=> client asks for suitable presentation [HTTP headers ==> Accept : application/json; Content-type: text/xml]

* ContentNegotionHandlers ==> HttpMessageHandlers

Accept: application/json
	==> server reads this header and decides which handler has to be used
	a) JSON ==> Jackson, jettison, GSON [ Java <--> JSON]
	b) XML ==> JAXB [ XML < -- > Java]

Best Practices:
* use nouns to represent resources
* Collection
	A collection resource is a server managed directory of resources
	clients may propose new resources to be added to a collection.
* Store
	client-managed resource repository
	/playlists
	/wishlist
	/cart
* Controller
	==> procedural concept ==> executable functions
	/checkout
	/play	
* use lowercase letters in URIs
* use hyphens (-) to improve readablity [ avoid (_)] health-users instead of healthUsers or health_users
* Never use CRUD functions names for URIs [ avoid /createUser] ==> HTTP verbs ==> GET, POST, PUT and DELETE
GET ==> READ
POST ==> CREATE
PUT ==> UPDATE a resource if exists else create
DELETE ==> remove a resource

* use query component to filter URI collections [ http://server.com:8080/products?category=mobiles]
* use pathparameter for singleton resources
	http://server.com/products/3 ==> id
	or
	sub-collections
	"/customers/{customerId}/accounts"

---

Resource Representation consists of:
* data
* the metadata 
* hypermedia links ==> can help the clients in transition to next desired state

Guiding Principles of REST:
1) Uniform Interface
2) Client-server
	Seperatation of concerns
3) Stateless
	* each request from client to the server must contain all of the information necessary to understand the complete
	request
	Server cannot take advantage of any previous stored context info on server
	* No Session Tracking [ no cookie for JSESSIONID and HttpSession]
4) Cachable
	Cache-Control, Expires, ETag
5)  Layered System
	==> each component cannot see beyond the immediate layer they are interacting with

=========================================================================

Spring Boot for building Restful web services

------------------

Spring Boot 2.7.x ==> Framework built on Spring Framework 5.x

* SOLID Design Principle 
Single Responsigility, Open Close Principle , Interface segregartion, Dependency Injection

Dependency Injection done using IoC

Spring provides:
1) Dependency Injection
2) Life cycle management
3) EAI ==> Spring Data , MongoRepo, Mailing Service, Messaging Services, Naming Service
4) AOP
5) Declarative Transaction Support

Spring Boot?
	==> Highly opiniated framework where lots of configuration comes out of the box; makes development easy

* IF we use RDBMS config;
	==> spring boot creates DataSource [ pool of database connections using HikariCP DB]

	If not spring boot:

	public DataSource getDataSource() {
		ComboPooledDataSource cpds = new ComboPooledDataSource();
		cpds.setDriverClass( "org.postgresql.Driver" ); //loads the jdbc driver            
		cpds.setJdbcUrl( "jdbc:postgresql://localhost/testdb" );
		cpds.setUser("swaldman");                                  
		cpds.setPassword("test-password");                                  
		
		// the settings below are optional -- c3p0 can work with defaults
		cpds.setMinPoolSize(5);                                     
		cpds.setAcquireIncrement(5);
		cpds.setMaxPoolSize(20);
		return cpds;
	}

* If we use ORM; ==> Spring boot configures Hibernate out of the Box
	
	if not Spring boot:

	public LocalContainerEntityManagerFactory emf(DataSource ds) {
			LocalContainerEntityManagerFactory emf = new LocalContainerEntityManagerFactory();
			emf.setDataSource(ds);
			emf.setJPAVendor(new HibernateJPAVendor());
			..


			return emf;	
	}

* Configure Transaction Mananger

--

If we develop web applications:
configures ==> Tomcat or Netty out of the box

==============

interface BookDao {
	addBook(Book);
}

public class BookDaoMongoImpl implements BookDao {
	..
}

public class BookDaoMySqlImpl implements BookDao {
	..
}

public class MyService {
	private BookDao dao;
	public MyService(BookDao dao) {
		this.dao = dao;
	}

	doTask() { dao.addBook(..)}
}


Constructor DI: 
beans.xml
<bean id="mongoDao" class="pkg.BookDaoMongoImpl" /> 
<bean id="mysqlDao" class="pkg.BookDaoMySQLImpl" /> 
<!-- create an instance of BookDaoMongoImpl by name "mongoDao" -->

<bean id="service" class="pkg.MyService"> 
	<constructor index="0" ref="mysqlDao" />
</bean>

==========


public class MyService {
	private BookDao dao;
	public void setRepo(BookDao dao) {
		this.dao = dao;
	}

	doTask() { dao.addBook(..)}
}

Setter DI:

beans.xml
<bean id="mongoDao" class="pkg.BookDaoMongoImpl" /> 
<bean id="mysqlDao" class="pkg.BookDaoMySQLImpl" /> 
<!-- create an instance of BookDaoMongoImpl by name "mongoDao" -->

<bean id="service" class="pkg.MyService"> 
	<property name="repo" ref="mysqlDao" />
</bean>

=======================

Annotation 


interface BookDao {
	addBook(Book);
}

@Repository
public class BookDaoMongoImpl implements BookDao {
	..
}

public class BookDaoMySqlImpl implements BookDao {
	..
}

@Service
public class MyService {
	@Autowired
	private BookDao dao; 
	 
	doTask() { dao.addBook(..)}
}

-------------

Spring instaniates objects of classes which has one of these annotations at class-level:
1) @Component ==> utility classes / helper classes
2) @Repository ==> Persistence tier code

	try {

	} catch(SQLException ex) {
		if(ex.getErrorCode() == 301) {
			throw new DuplicateKeyCodesExeption();
		}
	}

3) @Service
4) @Controller
5) @RestController
6) @Configuration


@Autowired ==> wiring happens using ByteCode instrumentation
* CGLib
* JavaAssist
* ByteBuddy

Book b = jpa.getById(4); ==> Proxy object instead of actual object [ CGLib creates proxy]
	==> not hit the DB

for(int i = 1; i <= 100; i ++) {
	Book[] books = ..
	books[i] = jpa.getById(i); // here we have 100 proxy objects
}

books[23].getTitle();  // hit the db and get book from DB; can't use proxy

books[45].getTitle();  // hit the db and get book from DB; can't use proxy

============================================

https://start.spring.io

====================================

For Standalone as well as web application ==> this is an entry point

```
@SpringBootApplication
public class DemoApplication {

	public static void main(String[] args) {
		SpringApplication.run(DemoApplication.class, args);
	}

}
```
BeanFactory, ApplicationContext are interfaces for SpringContainer
run(); creates a SpringContainer

SpringApplication.run(DemoApplication.class, args); ==> returns an ApplicationContext [ interface for Spring Container]


@SpringBootApplication
* @ComponentScan(basePackages="com.adobe.demo")
	==> scan com.adobe.demo and sub packages for any of the above mentioned (6) annoations and instanite

* @EnableAutoConfiguration
	==> looks in dependenies and instantiates configuration objects
	like Tomcat, DB pool, Hibernate , ...

* @Configuration

===

Problem:

***************************
APPLICATION FAILED TO START
***************************

Description:

Field bookDao in com.adobe.demo.service.SampleService required a single bean, but 2 were found:
	- bookDaoMongoImpl: defined in file [C:\Trainings WS\Adobe\MayRestfulWS\RESTful\demo\target\classes\com\adobe\demo\repo\BookDaoMongoImpl.class]
	- bookDaoMySQLImpl: defined in file [C:\Trainings WS\Adobe\MayRestfulWS\RESTful\demo\target\classes\com\adobe\demo\repo\BookDaoMySQLImpl.class]


* Solution 1:
* marking one of the beans as @Primary

@Repository
@Primary
public class BookDaoMySQLImpl implements BookDao {

@Repository
public class BookDaoMongoImpl implements BookDao {

* Solution 2:
* different uses cases needs different instances @Qualifier

@Repository
public class BookDaoMySQLImpl implements BookDao {

@Repository
public class BookDaoMongoImpl implements BookDao {


@Service
public class SampleService {
	@Autowired
	@Qualifier("bookDaoMongoImpl")
	private BookDao bookDao;

* Solution 3:

using @Profile


@Repository
@Profile("prod")
public class BookDaoMongoImpl implements BookDao {


@Repository
@Profile("dev")
public class BookDaoMySQLImpl implements BookDao {

@Service
public class SampleService {
	@Autowired
	private BookDao bookDao;

src/main/resources/application.properties
spring.profiles.active=dev

OR
Commandline argument

Run As ==> Run Configurations ==> Program Arguments
--spring.profiles.active=dev

How it resolves?
Command Line Arguments ==> System properties ==> application.properties

* Other ways to resolve

@ConditionalOnProperty

application.properties
dao=mysql

@ConditionalOnProperty(name = "dao", havingValue = "mongo")
public class BookDaoMongoImpl implements BookDao {

@ConditionalOnProperty(name = "dao", havingValue = "mysql")
public class BookDaoMySQLImpl implements BookDao {

---

@Repository
@ConditionalOnMissingBean(type = "BookDao.class")
public class BookDaoMongoImpl implements BookDao {

---------

@ConditionalOnBean(type = "MongoDBConnection.class")

=========================================================


Spring instantiates objects of classes which has any of the above 6 annoations.
* What about 3rd party classes to be used in Spring Container
* Spring Container by default uses default constructor for instantiatiting beans

@Bean ==> factory method

@Service
public class MyService {
	@Autowired
	DataSource ds; // c3p0 datasource

	doTask() {
		ds.getConnection()...
	}
}

@Configuration
public class AppConfig {

	@Bean
	public DataSource dataSource() {
		ComboPooledDataSource cpds = new ComboPooledDataSource();
		cpds.setDriverClass( "org.postgresql.Driver" ); //loads the jdbc driver            
		cpds.setJdbcUrl( "jdbc:postgresql://localhost/testdb" );
		cpds.setUser("dbuser");                                  
		cpds.setPassword("dbpassword"); 
		return cpds;
	}
}


===

@Order(100)
@Service
public class Comp1 {

}


@Order(-3)
@Service
public class Comp2 {

}

=====================

Spring Data JPA with RESTful Web services

============================================

Day 2

Spring Boot ==> Dependency Injection ==> provided by Core Modules
ApplicationContext ==> XML based or Annotation based metadata

@Component
@Repository
@Service
@Controller
@RestController
@Configuration
@Bean
@SpringBootApplication [ @ComponentScan, @EnableAutoConfiguration, @Configuration]

To control bean instantiations based on different requirements:
@Primary
@Qualifier
@Profile
@ConditionalOnProperty
@ConditionalOnBean
@ConditionalOnMissingBean

=================================

RESTful Webservices and JavaPersistence API


JPA ==> is a specification for using ORM

ORM ==> Object Relational Mapping

class <--> RDBMS

	ORM frameworks: Hibernate, JDO, KODO, TopLink, OpenJPA, ...

	JPA ==> Specifiation 

=============

Mapping class to table

@Entity
public class Product{}

@Entity
public class Vehicle{}

@Entity
public class Book {}

========

	@Bean
	public DataSource dataSource() {
		ComboPooledDataSource cpds = new ComboPooledDataSource();
		cpds.setDriverClass( "org.postgresql.Driver" ); //loads the jdbc driver            
		cpds.setJdbcUrl( "jdbc:postgresql://localhost/testdb" );
		cpds.setUser("dbuser");                                  
		cpds.setPassword("dbpassword"); 
		return cpds;
	}

	@Bean
	public LocalContainerEntityManagerFactory emf(DataSource ds) {
		LocalContainerEntityManagerFactory emf = new LocalContainerEntityManagerFactory();
		emf.setDataSource(ds);
		emf.setJpaProvider(new HibernateJpaVendor());
		emf.setBasePackagesToScan("com.adobe.prj.entity");
		return emf;
	}


=============



spring.jpa.hibernate.ddl-auto=update

Hibernate to DDL mapping
* update ==> TOP Down Approach
for a class mapped to table; if table exists use it else create the table

* create
for a class mapped to table; always drop the table and re-create

* verify ==> Bottom to Top Approach
for a class mapped to table; check if table exists; if exists use it else throw exception

===
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

Inform ORM to generate SQL matchin MySQL8

========


Spring Data JPA simplifies JPA with ORM operations

Part 1 with JDBC:
@Override
	public void addProduct(Product p) throws DaoException {
		String SQL = "INSERT INTO products (id, name, price, quantity) VALUES (0, ?, ?, ?)";
		Connection con = null;
		try {
			con = DriverManager.getConnection(URL, USER, PWD);
			PreparedStatement ps = con.prepareStatement(SQL);
			ps.setString(1, p.getName());
			ps.setDouble(2, p.getPrice());
			ps.setInt(3, p.getQuantity());
			ps.executeUpdate(); // INSERT, DELETE, UPDATE
		} catch (SQLException e) {
			throw new DaoException("unable to add product", e);
		} finally {
			if(con != null) {
				try {
					con.close();
				} catch (SQLException e) {
					e.printStackTrace();
				}
			}
		}
	}

	@Override
	public List<Product> getProducts() throws DaoException {
		List<Product> products = new ArrayList<>();
		String SQL = "SELECT id, name, price, quantity FROM products";
		Connection con = null;
		try {
			con = DriverManager.getConnection(URL, USER, PWD);
			Statement stmt = con.createStatement();
			ResultSet rs  = stmt.executeQuery(SQL); // SELECT
			while(rs.next()) {
				Product p = new Product();
				p.setId(rs.getInt("ID"));
				p.setName(rs.getString("NAME"));
				p.setPrice(rs.getDouble("PRICE"));
				p.setQuantity(rs.getInt("QUANTITY"));
				products.add(p);
			}
		} catch (SQLException e) {
			System.out.println(e.getErrorCode());
			throw new DaoException("unable to get products", e);
		} finally {
			if(con != null) {
				try {
					con.close();
				} catch (SQLException e) {
					e.printStackTrace();
				}
			}
		}
		return products;
	}

PART 2: using JPA with ORM

@Override
	public class ProductDaoJpaImpl .. {
	@PersistenceContext
	EntityManager em;

	public void addProduct(Product p) throws DaoException {
		em.persist(p);	 
	}

	@Override
	public List<Product> getProducts() throws DaoException {
		 TypedQuery<Product> query = ...
		 return query.getResultList();
	}


PART 3: using Spring Data JPA

public interface ProductDao extends JpaRepository<Product, Integer> {

}

==========

@Query("") can be SQL or JP-QL

exeucteQuery() ; select

executeUpdate(); update, delete and insert

===============================================

RESTful Web services 

 
 <dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-web</artifactId>
</dependency>
	==> gives:
	1) Tomcat as Servlet Container / web container [ Undertow, Netty, Jetty, --> need custom config]
	2) Spring Web MVC
	3) jackson [ Java <--> JSON ] [ XML, CSV, RSS --> need custom config]

	@Controller ==> to return SSR pages [ dynmaic HTML]
	@RestController ==> to return presentation of representation

	@RestController
	@RequestMapping("api/products")
	public class ProductController {
		@GetMapping()
		m1()

		@PostMapping()
		m2()
	}

===========

@Query("select name, price from Product p where p.price >= :l and p.price <= :h")
List<Object[]> queryByRange(@Param("l") double low, @Param("h") double high);

Object[0] ==> name
Object[1] ==> price

----
package com.adobe.prj.dto;
class ProductDTO {
	name
	price
	constuctors
	setters, getters
}


@Query("select new com.adobe.prj.dto.ProductDTO(name, price) from Product p where p.price >= :l and p.price <= :h")
List<ProductDTO> queryByRange(@Param("l") double low, @Param("h") double high);

-------------

POST http://localhost:8080/api/products

Headers:

Accept: application/json
content-type:application/json

Body [ raw is selected]
{
    "name":"LG Inverter AC",
    "price":49999.0,
    "category":"Electronics",
    "quantity":100
}

============

PUT http://localhost:8080/api/products/6

Accept: application/json
content-type:application/json

Body [ raw is selected]
{
   "quantity":200
}

javax.persistence.TransactionRequiredException: Executing an update/delete query

===============================


Programmatic Transaction

public void addProduct(Product p) {
	Connection con =. ..
	try {
		con.setAutoCommit(false);
			...
		con.commit();
	} catch(SQLException ex) {
		con.rollback();
	}
}

--


public void addProduct(Product p) {
	EntityManager em = ..
	Transaction tx = null;
	try {
		Transaction tx = em.beginTransaction();
			...
		tx.commit();
	} catch(SQLException ex) {
		tx.rollback();
	}
}

---

Declarative Transaction

@Transactional
public void addProduct(Product p) {
}

=============

i don't have below method:
@Modifying
@Query("update Product set quantity = :qty where id = :id")
void updateProduct(@Param("qty") int quantity, @Param("id") int id);


In Service:
	DIRTY Checking [ within PersistencContext / Trnsactional Boundary ]
	within transactional boundary if entity becomes dirty ==> automatic UPDATE is triggred
	@Transactional
	public void updateProduct(int qty, int id) {
		 productDao.findById(id).get();
		  productDao.findById(id).get();
		Product p =  productDao.findById(id).get();
		p.setQuantity(qty);
		// throw new IllegalStateException();
	}

===

Instead of Mutation with @Transactional; entity is given to View Tier [ Controller or Presentation page]
where data gets changed ==> No concept of DirtyChecking


===============================================================

AOP ==> Aspect Oriented Programming

* cross-cutting concerns leads to code tangling and code scatterning

Examples of cross-cutting concerns:
* Logging
* Security
* Profile
* Transaction

public void transferFunds(Account fa, Account to, double amt) {
	profile.startTime();
	log.debug("transaction started!!!")
	if(securityCtx.isAuthenticated()) {
		beginTX;
		log.debug("valid user");
		debit(amt);
		log.debug("amount debited");
		credit(amt);
		log.debug("amount credited!!1");
		commitTX;
	}
	profile.endTime();
}

---

AOP
* Aspect ==> bit of concern which can be used along with main logic ==> LogAspect, SecurityAspect, TransactionAspect
* JoinPoint ==> place in code where Aspect can be applied [ any method or any exception]
* PointCut ==> selected JoinPoint for weaving Aspect
* Advice ==> BeforeAdvice, AfterAdvice, AfterReturningAdvice, AroundAdvice, AfterThrowingAdvice


===========================

Customer 					<==> customers
	email 					<--> email [PK]
	firstName				<--> first_name
	lastName;				<--> last_name

CustomerDao
	==> No extra methods

OrderService
@Autowired
CustomerDao
	

CustomerController ==> OrderService ==> CustomerDao

===============================================================

Day 3:

--> JPA; EMF, EM, DataSource ==> Simplifiy CRUD; JpaRepository
	JpaRepository
	Custom querys in interfaces

	List<Product> findByCategory(String cat); // select * ... where category = ?

	@Query("") ==> JP-QL or Native SQL

	FOR DELETE, UPDATE or custom INSERT
	@Modifying
	@Query

	@Query("select name, price from Product")
	List<Object[]> methodWithScalarValues()	

	@Query("select new pkg.ProductDTO(name, price) from Product")
	List<ProductDTO> methodWithScalarValues()	

	interface IProduct {
			String getName();
			double getPrice();
	}

	List<IProduct> findByCategory();

---------

Spring MVC and building RESTful wS

DispatcherServlet ==> HandlerMapping ==> @Controller or @RestController

@RequestMapping
@RequestBody
@ResponseBody
@PathVariable
@RequestParam
ResponseEntity
@GetMapping()
@PostMapping()
@PutMapping()
@DeleteMapping()

@Transactional ==> Declarative Transaction

--------------------------

AOP


AspectJ is an aspect-oriented programming (AOP)

==> Spring Boot StaticWeaving ==> compilation or Loading [ StaticMethodMatcherPointcut ]

==> DynamicWeaving ==> AspectJ libraries [DynamicMethodMatcherPointcut, MethodInterceptor]

https://docs.spring.io/spring-framework/docs/2.0.x/reference/aop.html

public @interface Loggable{}

@Before("annotation(Loggable.class"))

@Loggable
m1()

@Loggable
m2()

=====================



@Around("execution(* * (..) && annotation(Transactional.class)")
	public Object doProfile(ProceedingJoinPoint pjp) throws Throwable {
		try {
			begin TX;
				Object ret = pjp.proceed();
			commit
		} catch(SQLException ex) {
			rolback();
		}
		
		return ret;
	}

=============

transaction(a1,a2, amt) {
	..
	..
	if(doCheckBalance(amt)) {

	}

} 

===========================================

@Before("@annotation(Loggable)")
public void logBefore(JoinPoint jp) {
		logger.info("Called : " + jp.getSignature());
		Object[] args = jp.getArgs();
		for (Object obj : args) {
			logger.info("arguments : " + obj);
		}
	}

============================================

Global Exception Handling for @Controller or @RestController

Using @ControllerAdvice Classes


=======================
Validation:

<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```
@Validated
public class ProductController {
	@PostMapping()
	public ResponseEntity<Product> addProduct(@RequestBody @Valid Product p) {
		p = service.insertProduct(p);
		return new ResponseEntity<Product>(p, HttpStatus.CREATED);
	}
	...
}

	@NotBlank(message="Name is required")
	@Column(name="name", nullable = false)
	private String name;
	
	@Min(value = 10, message="Price ${validatedValue} should be more than {value}")
	private double price;
	
	@Column(name="qty")
	@Min(value = 0, message="Quantity ${validatedValue} should be more than {value}")
	private int quantity;

```

POST http://localhost:8080/api/products

{
    "name":"",
    "price":-100.0,
    "category":"Electronics",
    "quantity":-5
}

{
    "timestamp": "2022-05-25T06:04:23.046+00:00",
    "status": 400,
    "error": "Bad Request",
    "path": "/api/products"
}

Resolved [org.springframework.web.bind.MethodArgumentNotValidException: Validation failed for argument [0] in public org.springframework.http.ResponseEntity<com.adobe.prj.entity.Product> com.adobe.prj.api.ProductController.addProduct(com.adobe.prj.entity.Product) with 3 errors: 

[Field error in object 'product' on field 'quantity': rejected value [-5]; codes [Min.product.quantity,Min.quantity,Min.int,Min]; arguments [org.springframework.context.support.DefaultMessageSourceResolvable: codes [product.quantity,quantity]; arguments []; default message [quantity],0]; 

default message [Quantity -5 should be more than 0]] 

[Field error in object 'product' on field 'name': rejected value []; codes [NotBlank.product.name,NotBlank.name,NotBlank.java.lang.String,NotBlank]; arguments [org.springframework.context.support.DefaultMessageSourceResolvable: codes [product.name,name]; arguments []; default message [name]]; 

default message [Name is required]] 

[Field error in object 'product' on field 'price': rejected value [-100.0]; codes [Min.product.price,Min.price,Min.double,Min]; arguments [org.springframework.context.support.DefaultMessageSourceResolvable: codes [product.price,price]; arguments []; default message [price],10]; 

default message [Price -100.0 should be more than 10]] ]

```

	 @ExceptionHandler(MethodArgumentNotValidException.class)
	 public ResponseEntity<Object> handleMethodArgumentNotValidException(MethodArgumentNotValidException ex) {
		 Map<String, Object> body = new LinkedHashMap<>();
		 body.put("time", new Date());
		 List<String> errors = ex.getBindingResult().getFieldErrors().stream()
				 	.map(exception -> exception.getDefaultMessage())
				 	.collect(Collectors.toList());
		 body.put("errors", errors);
		 return new ResponseEntity<Object>(body, HttpStatus.BAD_REQUEST);
	 }

{
    "time": "2022-05-25T06:11:04.407+00:00",
    "errors": [
        "Name is required",
        "Price -100.0 should be more than 10",
        "Quantity -5 should be more than 0"
    ]
}


```

Spring Boot devtools
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
</dependency>


----

pom.xml
Product.java
ProductController.java
@Validated and @Valid

GlobalExceptionHandler.java

-----------

Unit Testing Spring Boot application:

<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-test</artifactId>
			<scope>test</scope>
</dependency>

--> JUnit
--> Mockito [ mock api]
	Controller --> Service --> Dao --> database
	To test controllers we can mock Service tier
--> jsonpath https://jsonpath.com/
--> hamcrest ==> matchers for assertion [ AAA]


=======================


JPA ==> Mapping Associations

Swiggy, Amazon
	* Product
	* Supplier 
	* Customer
	* Order
	* Item
	* Payment
	* Address

mysql> insert into customers values ('peter@adobe.com','Peter', 'Smith');
mysql> insert into customers values ('sam@adobe.com','Samantha', 'Rai');


Order <--> Item

Assume 1 order has 4 items

orderDao.save(o);
itemDao.save(i1);
itemDao.save(i2);
itemDao.save(i3);
itemDao.save(i4);

With @OneToMany(cascade = CascadeType.ALL)

orderDao.save(o);

itemDao.save(i2);
itemDao.save(i3);
itemDao.save(i4);

With  
@OneToMany(cascade = CascadeType.ALL)
@JoinColumn(name="order_fk") // introduce FK in child
List<Item> items = new ArrayList<>();

orderDao.save(o); 
	takes care saving items also

orderDao.delete(o);
	deletes items of order

----

Fetching by default for oneToMany is LAZY fetching

orderDao.findById(Order.class, 10);
	select * from orders where oid = 10;

	items are not fetched from database;

---

@OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
	@JoinColumn(name="order_fk") // introduce FK in child
 	List<Item> items = new ArrayList<>();



orderDao.findById(Order.class, 10);
	select * from orders where oid = 10;

	items belonging to order with id 10 are also fetched from database;

--------------------

Bi-Directional

Customer.java
	
	@OneToMany(mappedBy="customer")
	List<Order> orders = new ArrayList<>();
	
Order.java
	@ManyToOne
	@JoinColumn(name="customer_fk") // introduce FK in owning entity
	private Customer customer;

==================================


ProductDao; CustomerDao; OrderDao

Order manages Item ==> cascade
No need for ItemDao; 

====================================


public interface OrderDao extends JpaRepository<Order, Integer> {

}

===============
order from client ==> React, Angular, Android, Swift, ...

POST http://localhost:8080/api/orders
{
	"customer": {
		"email": "sam@adobe.com"
	},
	"items": [
			{"product": {"id": 2}, "qty": 2},
		 	{"product": {"id": 6}, "qty": 4}
	]
}

===========

Order.java; Item.java; Customer.java

OrderService.java

ORderDao.java

OrderController.java

=======================================================

API Docs:

RAML, Swagger ==> API

/books:
  /{bookTitle}
    get:
      queryParameters:
        author:
          displayName: Author
          type: string
          description: An author's full name
          example: Mary Roach
          required: false
        publicationYear:
          displayName: Pub Year
          type: number
          description: The year released for the first time in the US
          example: 1984
          required: false
        rating:
          displayName: Rating
          type: number
          description: Average rating (1-5) submitted by users
          example: 3.14
          required: false
        isbn:
          displayName: ISBN
          type: string
          minLength: 10
          example: 0321736079
    put:
      queryParameters:
        access_token:
          displayName: Access Token
          type: string
          description: Token giving you permission to make call
          required: true

 Swagger ==> OpenAPI

 	<dependency>
			<groupId>org.springdoc</groupId>
			<artifactId>springdoc-openapi-ui</artifactId>
			<version>1.6.8</version>
	</dependency>

http://localhost:8080/v3/api-docs

http://localhost:8080/swagger-ui/index.html

springdoc.swagger-ui.enabled=false
springdoc.packagesToScan=com.package1, com.package2

springdoc.pathsToMatch=/api/**, /admin/**

=======================

@Bean
public OpenApi configOpenAPI() {
	return new OpenApi().info(..)..
}

====================================

by default Spring container creates a Singleton bean [ scope]

@Component
public class MyClass {

}



=======


@Scope("prototype")
@Service
public class OrderService { }

prototype ==> injects differnet instances of bean whereever @Autowired

@RestController
public class ProductController {
	@Autowired
	OrderService service
}


@RestController
public class OrderController {
	@Autowired
	OrderService service
}


===

@Scope("request")
@Service
public class OrderService { }

client makes a request ==> instance of OrderService is created and used until response is not commited
one instance per client request

===

@Scope("session")
@Service
public class OrderService { }
one per client session; 

=============================================



Health Check

A Distributed system ==> database, queues, other services

Health Check ==> status of our running applications ==> DOWN , SLOW

<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-actuator</artifactId>
</dependency>

application.properties
management.endpoints.web.exposure.include=*
management.metrics.distribution.percentiles-histogram.http.server.requests=true


	Predefined health indicators:
	1) DataSourceHealthIndicators
	2) MongoHealthIndicator
	3) RedisHealthIndicator

====================

Micrometer ==> library for Montoring tools [ Promethues, Grafana]


Prmoetheus ==> pull model ; scapring metrics from endpoints exposed by the application

<dependency>
	<groupId>io.micrometer</groupId>
	<artifactId>micrometer-registry-prometheus</artifactId>
</dependency>

http://localhost:8080/actuator/prometheus

docker run -d --name=prometheus -p 9090:9090 -v C:\prometheus\prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus --config.file=/etc/prometheus/prometheus.yml

=====================================================================

Assignment:

	Employee
		email; firstName

	Project
		id; name; client[string]; start_date; end_date;

	EmployeeProject ==> Association class
		id; Employee; role; start_date; end_date

	EmployeeProject ==> Employee will be ManyToOne
	EmployeeProject ==> Project will be ManyToOne

	Endpoints
	1) http://localhost:8080/api/employees
		CREATE 
	2) http://localhost:8080/api/projects
		CREATE
	3) http://localhost:8080/api/employees-projects

		CREATE
		{
			employee: {},
			project: {},
			start_date:
			end_date:
		}

		GET

		JPA.pdf

====================

http://localhost:8080/actuator/health/fetch-products-health

============

Day 4:

* AOP
* Validation [ javax.validation.contraints] ==> @Valid ==> MethodArgumentNotValidException
* @ControllerAdvice, @ExceptionHandler
* Association between entities [ Cascade, Lazy and EAGER, DirtyChecking @Transactional]
* @WebMvcTest
* OpenAPI, Swagger to document APIs [ @Controller and @RestController] => @Tag, ApiOperation,..
* spring-boot-starter-actuator
	info, health, metrics
	micrometer ==> Prometheus / Graffana [ Scrape ]

	jvm_threads_peak_threads
	jvm_threads_live_threads
	jvm_threads_states_threads

	http_server_requests_seconds_count ==> total number of requests app received at this endpoint
	http_server_requests_seconds_sum ==> total duration number of requests app received at this endpoint


rate(http_server_requests_seconds_count{uri="/api/products"}[2m])


==================================================================================

Spring is an alternate to Enterprise Java Bean [ executed within EJB container provided by Application Server]

EJB ==> Distributed computing [ iiop (Java <--> C++ / VB)]

====================================================================

@Test ==> info to Unit testing Framework to execute these methods ==> JUnit, TestNG

SpringContainer ==> Beans are created 


@WebMvcTest(ProductController.class) ==> 

TestDispatcherServlet instead of DispatcherServlet

@MockBean OrderService

===========================================

Use @Mock when unit testing your business logic (only using JUnit and Mockito). 

Use @MockBean when you write a test that is backed by a Spring Test Context and you want to add or replace a bean with a mocked version of it.

======================================================================================

RestTemplate

The RestTemplate is the central Spring class for client-side HTTP access. 

Java Client [ Standalone, RestfulServer] ==> wants to consume APIs

Testing APIs

String result = template.getForObject("http://localhost:8080/api/products", String.class);
	

[{"id":1,"name":"Sony Bravia","price":135000.0,"category":"LED","quantity":100},{"id":2,"name":"MotoG","price":12999.0,"category":"4G","quantity":98},{"id":3,"name":"Onida Thunder","price":3500.0,"category":"CRT","quantity":100},{"id":4,"name":"iPhone XR","price":99999.0,"category":"4G","quantity":100},{"id":5,"name":"Oppo","price":9999.0,"category":"4G","quantity":100},{"id":6,"name":"LG Inverter AC","price":49999.0,"category":"Electronics","quantity":196}]


========================================

Caching
	Expires, Cache-Control, ETag

Product with id 4 ==> ETag identifier

The ETag (or entity tag) HTTP response header is an identifier for a specific version of a resource. 

GET  http://localhost:8080/api/products/cache/3

Etag: "777469997"

Body {...}


GET http://localhost:8080/api/products/4
If-None-Match: "777469997"

REsponse ==> 304, no payload

==> Hits Server, gets data from database ==> for the entity match the ETag; if matches ==> Send NOT_MODIFIED (304)

It lets caches be more efficient and save bandwidth, as a web server does not need to resend a full response if the content was not changed


@Version
private int version;

initial value in DB will be 0

every mutation done to the row => version gets updated

==================================================================
Database Level Caching with Hibernate ==> ECache, JBossSwarmCache

Caching @ Server 

<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-cache</artifactId>
</dependency>

ConcurrentMapCache
ConcurrentMapCacheManager

@SpringBootApplication
@EnableCaching
public class RestfulexampleApplication {

--
	to store in cache
	@Cacheable(value="productCache", key="#id")
	@GetMapping("/cache/{id}")
	public @ResponseBody Product getProductCache(@PathVariable("id") int id) throws NotFoundException {
		System.out.println("Cache miss!!!!");
		try {
			Thread.sleep(2000);
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
		return service.getById(id);
	}
	

	to update cache:
	
	@CachePut(value="productCache", key="#id")
	@PutMapping("/{id}")
	public @ResponseBody Product updateProduct(@PathVariable("id") int id, @RequestBody Product p) throws NotFoundException {
		service.updateProduct(p.getQuantity(), id);
		return service.getById(id);
	}

	// remove from cache

	@CacheEvict(value="productCache", key="#id")
	@DeleteMapping("/{id}")
	public void deleteProduct(@PathVariable("id") int id) {
		
	}

	@GetMapping("/clear")
	@CacheEvict(value="productCache", allEntries = true)
	public @ResponseBody String clear() {
		return "cacche cleared!!!";
	}

	@Cacheable(value="productCache", key="#p.id", condition = "#p.price > 20000")
	@PostMapping()
	public ResponseEntity<Product> addProduct(@RequestBody @Valid Product p) {
	

	--

	@Cacheable(value="productCache", key="#id", unless = "#result !=null")
	@PostMapping()
	public Product getProduct(int id) {
	
--------------------------

Scheduling
@EnableScheduling

https://spring.io/blog/2020/11/10/new-in-spring-5-3-improved-cron-expressions

@Scheduled(fixedRate = 2000)
@Scheduled(fixedRate = 2000)
@Scheduled(fixedDelay  = 2000)
@Scheduled(cron  = "0 0/30 * * * *")

--


@SpringBootApplication
@EnableCaching
@EnableScheduling
public class RestfulexampleApplication {
	
	@Autowired
	private CacheManager cacheManager;
	
	@Scheduled(cron  = "0 0/30 * * * *")
	public void clearCache() {
		System.out.println("Cache Clear!!!");
		cacheManager.getCacheNames().forEach(name -> {
			cacheManager.getCache(name).clear();
		});
	}

========

docker run --name some-redis -p 6379:6379 -d redis

	<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-cache</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-data-redis</artifactId>
		</dependency>

spring.redis.port=6379
spring.redis.host=127.0.0.1

package com.adobe.prj.cfg;

import java.time.Duration;

import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;

@Configuration
//@EnableCaching
public class RedisCustomConfig {

	@Bean
	public RedisCacheConfiguration cacheConfiguration() {
		return RedisCacheConfiguration.defaultCacheConfig()
				.entryTtl(Duration.ofMinutes(60))
				.disableCachingNullValues()
				.serializeValuesWith(SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));
	}

	@Bean
	public RedisCacheManagerBuilderCustomizer redisCacheManagerBuilderCustomizer() {
		return (builder) -> builder
				.withCacheConfiguration("productCache",
						RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofMinutes(10)))
				.withCacheConfiguration("customerCache",
						RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofMinutes(5)));
	}

}

=========

nodejs

npm i -g redis-commander
redis-commander
http://localhost:8081/

=========

nodejs

npm i -g redis-commander
redis-commander
http://localhost:8081/

===============================

HATEOAS: Hypermedia as the Engine of Application State (HATEOAS) 

http://swiggy.com/orders

1) http://swiggy.com/orders/1/confirm
2) http://swiggy.com/orders/1/cancel

and 
1.1) http://swiggy.com/orders/1/pay

1.3) http://swiggy.com/orders/1/track

===========

http://localhost:8080/books/3

{
	_link: {
		"self": "http://localhost:8080/books/3",
		"author": "http://localhost:8080/books/3/author",
		"supplier": http://localhost:8080/books/3/supplier",
		"delete": "http://localhost:8080/books/3"
	}
}

WebMvcLinkBuilder: Builder to ease building Link instances

* EntityModel – represents RepresentationModel containing only single entity and related links
* CollectionModel – is a wrapper for a collection of entities and related links

<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-hateoas</artifactId>
</dependency>

@EnableHypermediaSupport(type = HypermediaType.HAL_FORMS)


@GetMapping("/hateoas/{pid}")
	public ResponseEntity<EntityModel<Product>> getProductWithLink(@PathVariable("pid") int id)
			throws NotFoundException {
		Product p = service.getById(id);
		EntityModel<Product> em = EntityModel.of(p,
				linkTo(methodOn(ProductController.class).getProductWithLink(id)).withSelfRel()
				.andAffordance(afford(methodOn(ProductController.class).updateProduct(id, null)))
				.andAffordance(afford(methodOn(ProductController.class).deleteProduct(id))),
				linkTo(methodOn(ProductController.class).getProducts(0, 0)).withRel("products"));

		return ResponseEntity.ok(em);
	}
===

HATEOAS, ASYNC, Reactive, Security

===================================================


Day 5

import axios from 'axios';

export default function ProductList {

	React.useEffect(() => {
		axios.get("http://localhost:8080/products").then (response => {

		})
	})

	return <>

	</>
}

fetch("http://localhost:8080/api/products").then(response => response.json()).then(data => console.log(data))

=================================

HATEOAS
Level 3 RESTful services
data + links

WebMvcLinkBuilder linkTo, affordance, methodOn

===========
Spring Data REST ==> HATEOAS + Spring Data JPA + RestController


MySQL, JPA, Web, Rest Respositories
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-data-jpa</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-data-rest</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-web</artifactId>
		</dependency>

		<dependency>
			<groupId>mysql</groupId>
			<artifactId>mysql-connector-java</artifactId>
			<scope>runtime</scope>
		</dependency>

Spring Data REST ==> spring-boot-starter-data-rest exposes endpoints based on Respositories

No need for Controller

http://localhost:8080/products
http://localhost:8080/products?page=0&size=3
http://localhost:8080/products/search
http://localhost:8080/products/search/findByCategory?category=4G

"rel"

"product-range" : {
          "href" : "http://localhost:8080/products/search/range?"
        },

public interface ProductDao extends JpaRepository<Product, Integer>{


	@RestResource(path="range", rel="product-range")
	@Query("from Product p where p.price >= :l and p.price <= :h")
	List<Product> queryByRange(@Param("l") double low, @Param("h") double high);


	@RestResource(exported=false)
	@Modifying
	@Query("update Product set quantity = :qty where id = :id")
	void updateProduct(@Param("qty") int quantity, @Param("id") int id);
}



===

@RespositoryRestResource(path="members", collectionResourceRel="registered-members")
public interface CustomerDao extends JpaRepository<Customer, Integer>{
}

instead of
http://localhost:8080/customers
we have
http://localhost:8080/members/

if we get order:
{
	"orderDate": ..
	"registerd-members" : { "email": // }
}

========

Projection

@Projection(
		name="productdata",
		types = {Product.class})
public interface ProductDTO {
	String getName();
	double getPrice();
}



http://localhost:8080/products/1?projection=productdata

====

Excerpts
Projections ==> default to resource

@RespositoryRestResource(excerpts= CustomCustomer.class)
public interface CustomerDao extends JpaRepository<Customer, Integer>{
}

================

application.properties

spring.data.rest.base-path=/api

============

Avoid using @RestController in Spring Data Rest

Prefer:
@BasePathAwareController
	to override endpoints

@RepositoryRestController
	to add more endpoints on top of what Spring Data Rest

============================

@Component 
public class CustomConfig implements RepositoryRestConfigurer {
	public void configureRepositoryRestConfiguration(RepositoryRestConfiguration config, CorsRegistry cors) {
		// using config disable few HTTP methods; set base path
	}
}

==============================================================

Async

@EnableAsync ==> allowing Threadpool creation [ not Tomcat Thread pool]


Create Pool of Thread connections

@Bean(name = "asyncExecutor")
public Executor asyncExecutor() {
		..
}


interface Callable<T> {
	T call() throws Exception;
}

Returned data is Future [ Promise API ]

========================================================================

Reactive Programming
	RxJava, Reactor.io, Vert.X

Spring Boot ==> Webflux MVC
	Netty web server, with Reactive Streams using Project Reactor	

 
a. All requests are reciveid to  a unique socket ==> SocketChannel
b) event loop ==> for ScoketChannels

c. eventloop inbound channel handlers ==> processing [ prefer NIO r2dbc , ReactiveMongoRepository]
d. application specifc code is executed
e. on completeion evntloop check outbound channel
f. response is sent Socket

reapeat above

============

Security / MicroService

=================================

<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-security</artifactId>
</dependency>
one default user with "username": "user" and
Using generated security password: 8427b82a-2ddc-46f8-95f2-4784049ae982

is created

--> Loginpage

http://localhost:8080/login
http://localhost:8080/logout


JWT

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Header:
{
  "alg": "HS256",
  "typ": "JWT"
}


Payload:
{
  "sub": "banu",
  "name": "Banuprakash",
  "iat": 1516239022,
  "exp": 1616239022,
  "iss": "adobe"
}

HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  your-256-bit-secret
)  

===

POST : http://localhost:8080/login
Headers
accept: json
content-type: json

Response Headers:
Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJiYW51IiwiYXV0aG9yaXRpZXMiOlt7ImF1dGhvcml0eSI6IlJPTEVfVVNFUiJ9XSwiaWF0IjoxNjUzNjM2NzYwLCJleHAiOjE2NTQ0NTM4MDB9.Y0TjbwWqXzZwS-iGIZZCkl1xi537C_ZtaJQKgASFQocOdReoAtQqb7Ld_Xq3LXJL0KEH66M30OlvX5k0zwFnAA

---

GET http://localhost:8080/user

Authorization: Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJiYW51IiwiYXV0aG9yaXRpZXMiOlt7ImF1dGhvcml0eSI6IlJPTEVfVVNFUiJ9XSwiaWF0IjoxNjUzNjM2NzYwLCJleHAiOjE2NTQ0NTM4MDB9.Y0TjbwWqXzZwS-iGIZZCkl1xi537C_ZtaJQKgASFQocOdReoAtQqb7Ld_Xq3LXJL0KEH66M30OlvX5k0zwFnAA

=================================================
MicroServices:

1) DiscoveryService:
<dependency>
			<groupId>org.springframework.cloud</groupId>
			<artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
</dependency>

<dependencies>
			<dependency>
				<groupId>org.springframework.cloud</groupId>
				<artifactId>spring-cloud-dependencies</artifactId>
				<version>${spring-cloud.version}</version>
				<type>pom</type>
				<scope>import</scope>
			</dependency>
		</dependencies>

spring.application.name=discovery-service
server.port=8761

eureka.client.register-with-eureka= false
eureka.client.fetch-registry=false


@EnableEurekaServer
@SpringBootApplication
public class DiscoveryServiceApplication {

=====

Movie ==> Review

Reviewservice
<dependency>
			<groupId>org.springframework.cloud</groupId>
			<artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>

server.port=8083
spring.application.name=review-service

@EnableEurekaClient
public class ReviewServiceApplication {

http://localhost:8761

http://localhost:8083/reviews

=========

MovieService

<dependency>
			<groupId>org.springframework.cloud</groupId>
			<artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.cloud</groupId>
			<artifactId>spring-cloud-starter-openfeign</artifactId>
		</dependency>

Feign ==> Declartive Rest Client instead of using RestTemplate

@EnableFeignClients
@EnableEurekaClient
@SpringBootApplication
public class MovieServiceApplication {


Ribbon, Hystrix ==> Load Balancing, Api Gateway

http://localhost:8083
http://localhost:8081

http://localhost:8080/movies
http://localhost:8080/reviews

Spring Cloud Configuration ==> github config

==========================================================

