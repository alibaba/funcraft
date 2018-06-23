'use strict';

const policySchema = {
    '$id': '/Resources/Service/Role',
    'type': 'object',
    'properties': {
        'Version': { 
            'type': 'string' 
        },
        'Statement': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'Effect': {
                        'type': 'string'
                    },
                    'Action': {
                        'type': 'array',
                        'items': { 'type': 'string' }
                    },
                    'Resource': {
                        'type': 'string'
                    }
                } ,
                'required': ['Effect', 'Action', 'Resource']
            },
        }
    },
    'required': ['Version', 'Statement']
};

module.exports = policySchema;