/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/ui/message', 'N/url'],

    function (currentRecord, message, url) {

        const DATA_SL = {}
        DATA_SL.DEPLOYID = 'customdeploy_fb_report_ctrl_de_ppto_sl'
        DATA_SL.SCRIPID = 'customscript_fb_report_ctrl_de_ppto_sl'
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            try {

            } catch (e) {
                console.log({ title: 'Error pageInit:', details: e });
            }
        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            try {

            } catch (e) {
                console.log({ title: 'Error fieldChanged:', details: e });
            }
        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(scriptContext) {

        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {

        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {

        }

        function get_Results() {
            try {
                console.log('get_Results');
                // Navigate to selected page
                var form = currentRecord.get();
                var stDate = form.getValue({ fieldId: 'custpage_sd' });
                if (stDate != '' && stDate != null)
                    stDate = format.format({ value: stDate, type: format.Type.DATE });
                // alert(stDate);
                var edDate = form.getValue({ fieldId: 'custpage_ed' });
                if (edDate != '' && edDate != null)
                    edDate = format.format({ value: edDate, type: format.Type.DATE });
                //alert(edDate);
                var sub = form.getValue({ fieldId: 'custpage_sub' });
                var paymentMethod = form.getValue({ fieldId: 'custpage_payment_method' });

                // TODO Colocar deployment original
                var su_url = url.resolveScript({
                    scriptId: SCRIPT_SUITELET.SCRIPTID,
                    deploymentId: SCRIPT_SUITELET.DEPLOYID,
                    params: {
                        'stDate': stDate,
                        'edDate': edDate,
                        'sub': sub,
                        'paymentMethod': paymentMethod
                    }
                });
                document.location = su_url;
            } catch (e) {
                console.log({ title: 'Error get_Results:', details: e });
            }
        }
        function descargarPdf() {
            try {
                var recordActual = currentRecord.get();
                var lineCount = recordActual.getValue({ fieldId: 'custpage_no_resultados' });
                resultados = lineCount
                if (lineCount > 0) {
                    var output = url.resolveScript({
                        scriptId: DATA_SL.SCRIPID, deploymentId: DATA_SL.DEPLOYID,
                        params: {
                            'operador': 'exportar',
                            filtros: JSON.stringify({
                                custpage_company: recordActual.getValue({ fieldId: 'custpage_company' }) || '',
                                custpage_period: recordActual.getValue({ fieldId: 'custpage_period' }) || '',
                                custpage_budget_position: recordActual.getValue({ fieldId: 'custpage_budget_position' }) || '',
                                custpage_account: recordActual.getValue({ fieldId: 'custpage_account' }) || '',
                                custpage_cost_center: recordActual.getValue({ fieldId: 'custpage_cost_center' }) || '',
                            })
                        }, returnExternalUrl: false,
                    });
                    window.open(output, '_self');

                } else {
                    // controlMessages('error_ejecutar')
                }
            } catch (e) {
                console.error("Error excel: ", e);
            }
        }
        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            get_Results: get_Results,
            descargarPdf: descargarPdf
            // postSourcing: postSourcing,
            // sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            // validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            // saveRecord: saveRecord
        };

    });
