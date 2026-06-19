import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Request Validation Middleware
 * ตรวจสอบความถูกต้องของข้อมูลที่ส่งมา
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }

    const extractedErrors = errors.array().map((err) => ({
      field: err.type === 'field' ? err.path : err.type,
      message: err.msg,
    }));

    res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ถูกต้อง',
      errors: extractedErrors,
    });
  };
}
