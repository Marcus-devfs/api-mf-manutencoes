import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

// Middleware para verificar erros de validação
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errorMessages,
    });
    return;
  }

  next();
};

// Middleware para validação assíncrona
export const asyncValidationHandler = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Executar todas as validações
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Verificar erros
    handleValidationErrors(req, res, next);
  };
};

// Middleware para sanitizar dados
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Função para sanitizar strings
  const sanitizeString = (str: string): string => {
    return str.trim().replace(/[<>]/g, '');
  };

  // Função para sanitizar objeto recursivamente
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitizar body, query e params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Middleware para limitar tamanho do payload
export const limitPayloadSize = (maxSize: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSize) {
      res.status(413).json({
        success: false,
        message: `Payload muito grande. Tamanho máximo: ${maxSize / 1024 / 1024}MB`,
      });
      return;
    }

    next();
  };
};

// Middleware para validar paginação
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sort = req.query.sort as string || 'createdAt';
  const order = req.query.order as string || 'desc';

  // Validar página
  if (page < 1) {
    res.status(400).json({
      success: false,
      message: 'Página deve ser maior que 0',
    });
    return;
  }

  // Validar limite
  if (limit < 1 || limit > 100) {
    res.status(400).json({
      success: false,
      message: 'Limite deve estar entre 1 e 100',
    });
    return;
  }

  // Validar ordem
  if (!['asc', 'desc'].includes(order.toLowerCase())) {
    res.status(400).json({
      success: false,
      message: 'Ordem deve ser "asc" ou "desc"',
    });
    return;
  }

  // Adicionar dados de paginação ao request
  req.pagination = {
    page,
    limit,
    sort,
    order: order.toLowerCase() as 'asc' | 'desc',
  };

  next();
};

// Extender interface Request para incluir paginação
declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number;
        limit: number;
        sort: string;
        order: 'asc' | 'desc';
      };
    }
  }
}

