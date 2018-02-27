pragma solidity 0.4.19;

/**
 * UintLinq - decorates uint[]
 *
 * Adds basic linq like functionalities 
 */
library UintLinq {

    /**
     * Sums up values in `self`
     *
     * @param self Reference to the decorated uint[]
     * @return uint Sum of `self`
     */
    function sum(uint[] self) public pure returns (uint) {
        uint response = 0;
        for (uint i = 0; i < self.length; i++) {
            response += self[i];
        }

        return response;
    }


    /**
     * Returns the larges value in `self`
     *
     * @param self Reference to the decorated uint[]
     * @return uint Largest value in `self`
     */
    function max(uint[] self) public pure returns (uint) {
        uint response = 0;
        for (uint i = 0; i < self.length; i++) {
            if (self[i] > response) {
                response = self[i];
            }
        }

        return response;
    }


    /**
     * Returns true if values in `self` contain duplicates
     *
     * @param self Reference to the decorated uint[]
     * @return bool Wheter values in `self` contain duplicates
     */
    function containsDuplicates(uint[] self) public pure returns (bool) {
        for (uint i = 0; i < self.length; i++) {
            for (uint j = 0; j < self.length; j++) {
                if (i != j && self[i] == self[j]) {
                    return true;
                }
            }
        }

        return false;
    }


    /**
     * Returns true if `self` contains all values in `_values`
     *
     * @param self Reference to the decorated uint[]
     * @param _values Reference to the target uint[]
     * @return bool Wheter `self` contains all values in `_values`
     */
    function containsAll(uint[] self, uint[] _values) public pure returns (bool) {
        for (uint i = 0; i < _values.length; i++) {
            if (!contains(self, _values[i])) {
                return false;
            }
        }

        return true;
    }


    /**
     * Returns true if `self` contains `_value`
     *
     * @param self Reference to the decorated uint[]
     * @param _value The target value
     * @return bool Wheter `self` contains `_value`
     */
    function contains(uint[] self, uint _value) public pure returns (bool) {
        for (uint i = 0; i < self.length; i++) {
            if (_value == self[i]) {
                return true;
            }
        }

        return false;
    }
}