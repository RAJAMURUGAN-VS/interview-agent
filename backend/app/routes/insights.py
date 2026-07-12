"""
Insights blueprint — all routes delegate to insights_service.
No business logic here.
"""

from flask import Blueprint, request, jsonify
from ..services.insights_service import (
    get_companies,
    get_company_posts,
    submit_experience,
    submit_preparation,
    upvote_post,
    report_post,
    search_posts,
)

bp = Blueprint("insights", __name__)


# ---------------------------------------------------------------------------
# GET /insights/companies
# Query params: ?search=<string>
# ---------------------------------------------------------------------------

@bp.route("/insights/companies", methods=["GET"])
def companies():
    search = request.args.get("search", "").strip()
    return jsonify(get_companies(search)), 200


# ---------------------------------------------------------------------------
# GET /insights/companies/<company>
# ---------------------------------------------------------------------------

@bp.route("/insights/companies/<string:company>", methods=["GET"])
def company_detail(company: str):
    data = get_company_posts(company)
    return jsonify(data), 200


# ---------------------------------------------------------------------------
# POST /insights/experience
# Body: JSON matching InterviewExperiencePost shape
# ---------------------------------------------------------------------------

@bp.route("/insights/experience", methods=["POST"])
def post_experience():
    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({"success": False, "error": "JSON body required."}), 400
    result, status = submit_experience(data)
    return jsonify(result), status


# ---------------------------------------------------------------------------
# POST /insights/preparation
# Body: JSON matching PreparationStrategyPost shape
# ---------------------------------------------------------------------------

@bp.route("/insights/preparation", methods=["POST"])
def post_preparation():
    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({"success": False, "error": "JSON body required."}), 400
    result, status = submit_preparation(data)
    return jsonify(result), status


# ---------------------------------------------------------------------------
# POST /insights/upvote/<post_type>/<id>
# post_type: "experience" | "preparation"
# ---------------------------------------------------------------------------

@bp.route("/insights/upvote/<string:post_type>/<string:post_id>", methods=["POST"])
def upvote(post_type: str, post_id: str):
    result, status = upvote_post(post_type, post_id)
    return jsonify(result), status


# ---------------------------------------------------------------------------
# POST /insights/report/<post_type>/<id>
# ---------------------------------------------------------------------------

@bp.route("/insights/report/<string:post_type>/<string:post_id>", methods=["POST"])
def report(post_type: str, post_id: str):
    result, status = report_post(post_type, post_id)
    return jsonify(result), status


# ---------------------------------------------------------------------------
# GET /insights/search?q=<query>
# ---------------------------------------------------------------------------

@bp.route("/insights/search", methods=["GET"])
def search():
    q = request.args.get("q", "").strip()
    result = search_posts(q)
    # search_posts returns a plain dict when query is too short — handle both
    if isinstance(result, tuple):
        data, status = result
        return jsonify(data), status
    return jsonify(result), 200
