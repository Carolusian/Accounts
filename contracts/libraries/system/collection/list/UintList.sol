pragma solidity 0.4.19;

/**
 * UintList - decorates uint[]
 *
 * Adds basic list like functionalities 
 */
library UintList {

    /**
     * Find the first index of `_value` or return -1
     *
     * @param self Copy of the decorated uint[]
     * @return int First index of `_value`
     */
    function indexOf(uint[] self, uint _value) public pure returns (int) {
        int response = int(-1);
        for (uint i = 0; i < self.length; i++) {
            if (self[i] == _value) {
                response = int(i);
                break;
            }
        }

        return response;
    }


    /**
     * Find the last index of `_value` or return -1
     *
     * @param self Copy of the decorated uint[]
     * @return uint Last index of `_value`
     */
    function lastIndexOf(uint[] self, uint _value) public pure returns (int) {
        int response = int(-1);
        for (uint i = self.length - 1; i >= 0; i--) {
            if (self[i] == _value) {
                response = int(i);
                break;
            }
        }

        return response;
    }
}