pragma solidity 0.4.19;

/**
 * Bytecode - decorates address
 *
 * Add functions to perform common tasks that 
 * require assembly
 */
library Bytecode {

    /**
     * Retreive the bytecode at `self`
     *
     * @param self location to retreive bytecode from
     * @return bytes
     */
    function getBytecode(address self) public view returns (bytes) {
        bytes memory myBytecode;
        assembly {
            // retrieve the size of the code, this needs assembly
            let size := extcodesize(self)
            // allocate output byte array - this could also be done without assembly
            // by using o_code = new bytes(size)
            myBytecode := mload(0x40)
            // new "memory end" including padding
            mstore(0x40, add(myBytecode, and(add(add(size, 0x20), 0x1f), not(0x1f))))
            // store length in memory
            mstore(myBytecode, size)
            // actually retrieve the code, this needs assembly
            extcodecopy(self, add(myBytecode, 0x20), 0, size)
        }

        return myBytecode;
    }


    /**
     * Retreive the bytecode at `self` and compare the bytecode 
     * to the bytecode at `_other`
     *
     * @param self location to retreive bytecode from
     * @param _other Address of the code we are comparing
     * @return bytes
     */
    function compareTo(address self, address _other) public view returns (bool) {
        return compareBytecode(self, getBytecode(_other));
    }


    /**
     * Retreive the bytecode at `self` and compare the bytecode 
     * to `_bytecode`
     *
     * @param self location to retreive bytecode from
     * @param _bytecode Bytecode to compare to
     * @return bytes
     */
    function compareBytecode(address self, bytes _bytecode) public view returns (bool) {
        bytes memory myBytecode = getBytecode(self);
        bool bytecodeMatch = myBytecode.length == _bytecode.length;
        if (bytecodeMatch) {
            for (uint i = 0; i < myBytecode.length; i++) {
                if (myBytecode[i] != _bytecode[i]) {
                    bytecodeMatch = false;
                    break;
                }
            }
        }

        return bytecodeMatch;
    }
}