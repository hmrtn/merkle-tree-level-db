# Merkle Tree Implementation with LevelDB

This project implements a [Merkle tree](https://en.wikipedia.org/wiki/Merkle_tree), a fundamental data structure used in distributed systems and cryptographic applications, using LevelDB for storage.

## Features
- Support for creating and managing a Merkle tree with up to 32 levels.
- Customizable tree depth during creation.
- Storage of tree data in LevelDB.
- Fast computation of tree nodes using a SHA-256 hash function.
- Supports reading and updating tree nodes.
- Efficient path computation for proofs of inclusion.
- Resilience to incorrect inputs with proper error handling.
- High test coverage to ensure correctness.

## Getting Started

Before running the project, please ensure that you have [Node.js](https://nodejs.org/en/download/) installed on your machine.

1. **Clone the repository**
```
git clone https://github.com/<username>/merkle-tree-level-db.git
```
2. **Install the dependencies**
```
cd merkle-tree-level-db
npm install
```
3. **Run the tests**
```
npm run test
```

## Usage

First, import the necessary classes from the package.

```javascript
import { LevelUp } from 'levelup';
import { MerkleTree } from 'merkle-tree-level-db';
```

To create a new Merkle tree or load an existing one from the database:

```javascript
const db = new LevelUp('/path/to/db');
const tree = await MerkleTree.new(db, 'tree-name', 10);
```

The `MerkleTree.new` function takes three arguments:

1. `db`: An instance of LevelUp representing the database where the tree's data is stored.
2. `name`: A string representing the name of the tree. This is used to distinguish between different trees in the same database.
3. `depth`: The depth of the tree (number of levels - 1). The default value is 32.

The `new` function checks if a tree with the given name exists in the database. If it does, it loads the tree; otherwise, it creates a new tree.

To add or update a value at a particular index in the tree:

```javascript
const index = 5;
const value = Buffer.from('Hello, world!');
await tree.updateElement(index, value);
```

The `updateElement` function updates the value at the given index and recalculates the hashes of the affected nodes in the tree.

To compute the root of the tree:

```javascript
const root = tree.getRoot();
```

The `getRoot` function returns the root hash of the tree.

## Contributing

Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License.

## Disclaimer

This is a simple implementation meant for learning and experimental purposes. It is not suitable for production use.